import { AcademicRecord } from "../../entities/academic-record.ts";
import { Course } from "../../entities/course.ts";
import { StudentProfile } from "../../entities/student-profile.ts";
import { isOk } from "../../errors/result.ts";
import { CourseId } from "../../value-objects/course-id.ts";
import { Credit } from "../../value-objects/credit.ts";
import { FieldCategory } from "../../value-objects/field-category.ts";
import { Grade } from "../../value-objects/grade.ts";
import { SubjectCategory } from "../../value-objects/subject-category.ts";

const defaultProfile = (() => {
	const r = StudentProfile.parse({
		facultyId: "humanities",
		courseId: "philosophy",
		matriculationYear: 2022,
	});
	if (!isOk(r)) throw new Error("fixture profile invalid");
	return r.value;
})();

let counter = 0;
const mkCourse = (
	credit: number,
	category: SubjectCategory,
	options: { grade?: Grade; name?: string } = {},
): Course => {
	counter += 1;
	const id = `FX${counter.toString().padStart(4, "0")}`;
	return Course.of({
		id: CourseId.of(id),
		name: options.name ?? `科目${id}`,
		credit: Credit.of(credit),
		grade: options.grade ?? Grade.Yu,
		category,
		rawCategoryLabel: "raw",
	});
};

const courses = (
	count: number,
	credit: number,
	category: SubjectCategory,
	options: { grade?: Grade } = {},
): Course[] =>
	Array.from({ length: count }, () => mkCourse(credit, category, options));

const makeGraduatable = (): AcademicRecord => {
	counter = 0;
	return AcademicRecord.of(defaultProfile, [
		// 初年次 12
		...courses(6, 2, SubjectCategory.primary()),
		// 教養 28（分野 4 × 4 + 外国語 8 + キャリア 4）
		...courses(2, 2, SubjectCategory.liberalField(FieldCategory.Humanities)),
		...courses(2, 2, SubjectCategory.liberalField(FieldCategory.Social)),
		...courses(2, 2, SubjectCategory.liberalField(FieldCategory.Natural)),
		...courses(2, 2, SubjectCategory.liberalField(FieldCategory.BioMedical)),
		...courses(4, 2, SubjectCategory.liberalForeignLanguage("英語")),
		...courses(2, 2, SubjectCategory.liberalCareer()),
		// ゼミ I・II 4
		...courses(2, 2, SubjectCategory.seminar12()),
		// ゼミ III・IV 4
		...courses(2, 2, SubjectCategory.seminar34()),
		// ゼミ V・VI + 卒論 8
		...courses(4, 2, SubjectCategory.seminar56Thesis()),
		// PF 30（基礎A 2 + B 2 + 基礎 2 + 外国語 4 + 発展 20）
		...courses(1, 2, SubjectCategory.platformBasicA()),
		...courses(1, 2, SubjectCategory.platformBasicB()),
		...courses(1, 2, SubjectCategory.platformBasicA()),
		...courses(2, 2, SubjectCategory.platformForeignLanguage()),
		...courses(10, 2, SubjectCategory.platformAdvanced()),
		// 選択 40（自コース）
		...courses(20, 2, SubjectCategory.electiveOwnCourse()),
	]);
};

const makeInsufficientCredits = (): AcademicRecord => {
	counter = 0;
	return AcademicRecord.of(defaultProfile, [
		...courses(3, 2, SubjectCategory.primary()),
		...courses(3, 2, SubjectCategory.liberalField(FieldCategory.Humanities)),
		...courses(1, 2, SubjectCategory.seminar12()),
	]);
};

const makeMissingField = (): AcademicRecord => {
	counter = 0;
	return AcademicRecord.of(defaultProfile, [
		...courses(6, 2, SubjectCategory.primary()),
		// 分野は 2 分野のみ
		...courses(4, 2, SubjectCategory.liberalField(FieldCategory.Humanities)),
		...courses(4, 2, SubjectCategory.liberalField(FieldCategory.Social)),
		...courses(2, 2, SubjectCategory.liberalForeignLanguage("英語")),
		...courses(4, 2, SubjectCategory.liberalCareer()),
		...courses(2, 2, SubjectCategory.seminar12()),
		...courses(2, 2, SubjectCategory.seminar34()),
		...courses(4, 2, SubjectCategory.seminar56Thesis()),
		...courses(15, 2, SubjectCategory.platformAdvanced()),
		...courses(1, 2, SubjectCategory.platformBasicA()),
		...courses(1, 2, SubjectCategory.platformBasicB()),
		...courses(2, 2, SubjectCategory.platformForeignLanguage()),
		...courses(19, 2, SubjectCategory.electiveOwnCourse()),
	]);
};

const makeThesisBlocked = (): AcademicRecord => {
	// Thesis 履修資格: 初年次 12 OK, ゼミ I/II 4 OK, ゼミ III/IV 4 OK, 総合 90 OK,
	// ただし外国語 4 単位は満たしていない
	counter = 0;
	return AcademicRecord.of(defaultProfile, [
		...courses(6, 2, SubjectCategory.primary()),
		...courses(2, 2, SubjectCategory.seminar12()),
		...courses(2, 2, SubjectCategory.seminar34()),
		...courses(4, 2, SubjectCategory.seminar56Thesis()),
		// 外国語は 2 単位しかない
		...courses(1, 2, SubjectCategory.liberalForeignLanguage("英語")),
		...courses(35, 2, SubjectCategory.electiveOwnCourse()),
	]);
};

/**
 * キャリア上限 6 単位を超えて履修しても、教養合計 28 には 6 単位しか算入されない
 * ことを検証するシナリオ。見かけ上「field 12 + 外国語 8 + career 8 = 28」だが、
 * 実効は「field 12 + 外国語 8 + career 6 = 26」で不足扱い。
 */
const makeCareerOverflow = (): AcademicRecord => {
	counter = 0;
	return AcademicRecord.of(defaultProfile, [
		// 初年次 12
		...courses(6, 2, SubjectCategory.primary()),
		// 教養（一見 28 だがキャリア 8 → 実効 6 なので実効 26）
		...courses(2, 2, SubjectCategory.liberalField(FieldCategory.Humanities)),
		...courses(2, 2, SubjectCategory.liberalField(FieldCategory.Social)),
		...courses(2, 2, SubjectCategory.liberalField(FieldCategory.Natural)),
		...courses(4, 2, SubjectCategory.liberalForeignLanguage("英語")),
		...courses(4, 2, SubjectCategory.liberalCareer()),
		// ゼミ
		...courses(2, 2, SubjectCategory.seminar12()),
		...courses(2, 2, SubjectCategory.seminar34()),
		...courses(4, 2, SubjectCategory.seminar56Thesis()),
		// PF 30
		...courses(1, 2, SubjectCategory.platformBasicA()),
		...courses(1, 2, SubjectCategory.platformBasicB()),
		...courses(1, 2, SubjectCategory.platformBasicA()),
		...courses(2, 2, SubjectCategory.platformForeignLanguage()),
		...courses(10, 2, SubjectCategory.platformAdvanced()),
		// 選択
		...courses(20, 2, SubjectCategory.electiveOwnCourse()),
	]);
};

export const fixtures = {
	graduatable: makeGraduatable,
	insufficientCredits: makeInsufficientCredits,
	missingField: makeMissingField,
	thesisBlocked: makeThesisBlocked,
	careerOverflow: makeCareerOverflow,
} as const;
