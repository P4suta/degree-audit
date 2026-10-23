use lopdf::{Document, Object, Stream, dictionary};
use pdf_glyphs::{ExtractError, Fragment, extract};

fn pdf(pages: &[Vec<&[u8]>]) -> Vec<u8> {
    let mut doc = Document::with_version("1.5");
    let pages_id = doc.new_object_id();
    let cmap_id = doc.add_object(Stream::new(
        dictionary! {},
        b"1 begincodespacerange <00> <FF> endcodespacerange\n\
          2 beginbfchar <41> <0041> <42> <0042> endbfchar"
            .to_vec(),
    ));
    let font_id = doc.add_object(dictionary! {
        "Type" => "Font",
        "Subtype" => "Type1",
        "BaseFont" => "Helvetica",
        "Encoding" => "WinAnsiEncoding",
        "ToUnicode" => cmap_id,
    });
    let mut kids = Vec::new();
    for streams in pages {
        let contents: Vec<Object> = streams
            .iter()
            .map(|bytes| {
                doc.add_object(Stream::new(dictionary! {}, bytes.to_vec()))
                    .into()
            })
            .collect();
        let mut page = dictionary! {
            "Type" => "Page",
            "Parent" => pages_id,
            "MediaBox" => vec![0.into(), 0.into(), 300.into(), 300.into()],
            "Resources" => dictionary! { "Font" => dictionary! { "F1" => font_id } },
        };
        if !contents.is_empty() {
            page.set("Contents", contents);
        }
        kids.push(Object::Reference(doc.add_object(page)));
    }
    doc.objects.insert(
        pages_id,
        dictionary! {
            "Type" => "Pages",
            "Count" => i64::try_from(kids.len()).expect("page count"),
            "Kids" => kids,
        }
        .into(),
    );
    let catalog_id = doc.add_object(dictionary! { "Type" => "Catalog", "Pages" => pages_id });
    doc.trailer.set("Root", catalog_id);
    let mut bytes = Vec::new();
    doc.save_to(&mut bytes).expect("serialize synthetic PDF");
    bytes
}

#[test]
fn extracts_fragments_across_content_streams_in_page_order() {
    let bytes = pdf(&[
        vec![b"BT /F1 12 Tf 1 0 0 1 10 20 Tm <41> Tj", b"<42> Tj ET"],
        vec![b"BT /F1 9 Tf 1 0 0 1 30 40 Tm <42> Tj ET"],
    ]);
    assert_eq!(
        extract(&bytes).expect("extract synthetic PDF"),
        vec![
            Fragment {
                page: 1,
                x: 10.0,
                y: 20.0,
                font_size: 12.0,
                text: "A".into()
            },
            Fragment {
                page: 1,
                x: 10.0,
                y: 20.0,
                font_size: 12.0,
                text: "B".into()
            },
            Fragment {
                page: 2,
                x: 30.0,
                y: 40.0,
                font_size: 9.0,
                text: "B".into()
            },
        ]
    );
}

#[test]
fn skips_empty_and_malformed_pages_and_keeps_later_text() {
    let bytes = pdf(&[
        vec![],
        vec![b"BT (unterminated"],
        vec![b"BT /F1 12 Tf 1 0 0 1 10 20 Tm <41> Tj ET"],
    ]);
    assert_eq!(
        extract(&bytes).expect("extract later page"),
        vec![Fragment {
            page: 3,
            x: 10.0,
            y: 20.0,
            font_size: 12.0,
            text: "A".into()
        }]
    );
}

#[test]
fn rejects_an_invalid_container() {
    assert!(matches!(extract(b"not a PDF"), Err(ExtractError::Parse(_))));
}
