//! Interpreter for the text-showing subset of a page content stream.
//!
//! The stream is first decoded into operator/operand tuples by `lopdf`, then
//! replayed through a small text-state machine that tracks the current
//! transformation matrix (CTM), the text and text-line matrices, and the
//! selected font. Each `Tj` / `TJ` operator emits one [`Fragment`] positioned
//! at the text-space origin transformed into user space (`Tm · CTM`).

use std::collections::BTreeMap;

use lopdf::Object;
use lopdf::content::Operation;

use crate::Fragment;
use crate::cmap::ToUnicode;

/// A 2-D affine transform in PDF form `[a b c d e f]`, acting on row vectors:
/// `x' = a·x + c·y + e`, `y' = b·x + d·y + f`.
#[derive(Debug, Clone, Copy)]
struct Matrix {
    a: f32,
    b: f32,
    c: f32,
    d: f32,
    e: f32,
    f: f32,
}

impl Matrix {
    const IDENTITY: Matrix = Matrix {
        a: 1.0,
        b: 0.0,
        c: 0.0,
        d: 1.0,
        e: 0.0,
        f: 0.0,
    };

    fn translation(tx: f32, ty: f32) -> Matrix {
        Matrix {
            a: 1.0,
            b: 0.0,
            c: 0.0,
            d: 1.0,
            e: tx,
            f: ty,
        }
    }

    /// Compose `self` then `other` (a point is transformed by `self` first):
    /// `p · (self · other)`.
    fn then(self, other: Matrix) -> Matrix {
        Matrix {
            a: self.a * other.a + self.b * other.c,
            b: self.a * other.b + self.b * other.d,
            c: self.c * other.a + self.d * other.c,
            d: self.c * other.b + self.d * other.d,
            e: self.e * other.a + self.f * other.c + other.e,
            f: self.e * other.b + self.f * other.d + other.f,
        }
    }
}

/// Text-showing state accumulated while replaying a page's operators.
struct TextState<'a> {
    page: u16,
    ctm_stack: Vec<Matrix>,
    ctm: Matrix,
    text_matrix: Matrix,
    line_matrix: Matrix,
    leading: f32,
    font_size: f32,
    font: Option<&'a ToUnicode>,
}

impl<'a> TextState<'a> {
    fn new(page: u16, _fonts: &'a BTreeMap<Vec<u8>, ToUnicode>) -> Self {
        TextState {
            page,
            ctm_stack: Vec::new(),
            ctm: Matrix::IDENTITY,
            text_matrix: Matrix::IDENTITY,
            line_matrix: Matrix::IDENTITY,
            leading: 0.0,
            font_size: 0.0,
            font: None,
        }
    }

    /// Apply `Td`-style line displacement, updating both text matrices.
    fn move_line(&mut self, tx: f32, ty: f32) {
        self.line_matrix = Matrix::translation(tx, ty).then(self.line_matrix);
        self.text_matrix = self.line_matrix;
    }

    /// Emit a fragment for a shown text run, if it decodes to non-empty text.
    fn show(&self, strings: &[&[u8]], out: &mut Vec<Fragment>) {
        let Some(font) = self.font else { return };
        let text = decode_run(font, strings);
        if text.is_empty() {
            return;
        }
        let origin = self.text_matrix.then(self.ctm);
        out.push(Fragment {
            page: self.page,
            x: origin.e,
            y: origin.f,
            font_size: self.font_size,
            text,
        });
    }
}

/// Replay a page's operators, appending one [`Fragment`] per shown text run.
pub(crate) fn interpret(
    page: u16,
    operations: &[Operation],
    fonts: &BTreeMap<Vec<u8>, ToUnicode>,
    out: &mut Vec<Fragment>,
) {
    let mut state = TextState::new(page, fonts);

    for op in operations {
        match op.operator.as_str() {
            "q" => state.ctm_stack.push(state.ctm),
            "Q" => {
                if let Some(m) = state.ctm_stack.pop() {
                    state.ctm = m;
                }
            }
            "cm" => {
                if let Some(m) = read_matrix(&op.operands) {
                    state.ctm = m.then(state.ctm);
                }
            }
            "BT" => {
                state.text_matrix = Matrix::IDENTITY;
                state.line_matrix = Matrix::IDENTITY;
            }
            "Tm" => {
                if let Some(m) = read_matrix(&op.operands) {
                    state.text_matrix = m;
                    state.line_matrix = m;
                }
            }
            "Td" => {
                if let [tx, ty] = read_floats(&op.operands)[..] {
                    state.move_line(tx, ty);
                }
            }
            "TD" => {
                if let [tx, ty] = read_floats(&op.operands)[..] {
                    state.leading = -ty;
                    state.move_line(tx, ty);
                }
            }
            "T*" => {
                let leading = state.leading;
                state.move_line(0.0, -leading);
            }
            "TL" => {
                if let Some(v) = op.operands.first().and_then(as_float) {
                    state.leading = v;
                }
            }
            "Tf" => {
                if let Some(name) = op.operands.first().and_then(as_name) {
                    state.font = fonts.get(name);
                }
                if let Some(size) = op.operands.get(1).and_then(as_float) {
                    state.font_size = size;
                }
            }
            "Tj" => {
                if let Some(s) = op.operands.first().and_then(as_string) {
                    state.show(&[s], out);
                }
            }
            "'" => {
                let leading = state.leading;
                state.move_line(0.0, -leading);
                if let Some(s) = op.operands.first().and_then(as_string) {
                    state.show(&[s], out);
                }
            }
            "\"" => {
                let leading = state.leading;
                state.move_line(0.0, -leading);
                if let Some(s) = op.operands.get(2).and_then(as_string) {
                    state.show(&[s], out);
                }
            }
            "TJ" => {
                if let Some(Object::Array(items)) = op.operands.first() {
                    let strings: Vec<&[u8]> = items.iter().filter_map(as_string).collect();
                    state.show(&strings, out);
                }
            }
            _ => {}
        }
    }
}

/// Decode the concatenated code strings of a run into Unicode text using the
/// current font's ToUnicode map. Unmapped codes are dropped.
fn decode_run(font: &ToUnicode, strings: &[&[u8]]) -> String {
    let width = font.code_bytes().max(1);
    let mut text = String::new();
    for bytes in strings {
        for chunk in bytes.chunks(width) {
            let code = chunk.iter().fold(0u32, |acc, &b| (acc << 8) | b as u32);
            if let Some(s) = font.lookup(code) {
                text.push_str(&s);
            }
        }
    }
    text
}

/// Read exactly six numeric operands as a [`Matrix`], if present.
fn read_matrix(operands: &[Object]) -> Option<Matrix> {
    if let [a, b, c, d, e, f] = read_floats(operands)[..] {
        Some(Matrix { a, b, c, d, e, f })
    } else {
        None
    }
}

/// Collect the leading numeric operands as `f32`, stopping at the first
/// non-numeric operand.
fn read_floats(operands: &[Object]) -> Vec<f32> {
    operands.iter().map_while(as_float).collect()
}

fn as_float(obj: &Object) -> Option<f32> {
    obj.as_float().ok()
}

fn as_name(obj: &Object) -> Option<&[u8]> {
    obj.as_name().ok()
}

fn as_string(obj: &Object) -> Option<&[u8]> {
    obj.as_str().ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matrix_then_composes_in_application_order() {
        // Scale by 2 then translate by (10, 5): a point (1,1) -> (12, 7).
        let scale = Matrix {
            a: 2.0,
            b: 0.0,
            c: 0.0,
            d: 2.0,
            e: 0.0,
            f: 0.0,
        };
        let translate = Matrix::translation(10.0, 5.0);
        let m = scale.then(translate);
        assert_eq!((m.a, m.d), (2.0, 2.0));
        assert_eq!((m.e, m.f), (10.0, 5.0));
        // origin (0,0) maps to the translation part.
        assert_eq!((m.e, m.f), (10.0, 5.0));
    }
}
