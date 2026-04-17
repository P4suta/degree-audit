import { AcademicRecord } from "../../entities/academic-record.ts";
import { Course } from "../../entities/course.ts";
import { StudentProfile } from "../../entities/student-profile.ts";
import { isOk } from "../../errors/result.ts";
import { CourseId } from "../../value-objects/course-id.ts";
import { Credit } from "../../value-objects/credit.ts";
import { Grade } from "../../value-objects/grade.ts";
import { SubjectCategory } from "../../value-objects/subject-category.ts";

const defaultProfile = (() => {
	const r = StudentProfile.parse({
		facultyId: "人文社会科学部",
		courseId: "人文科学コース",
		matriculationYear: 2024,
	});
	if (!isOk(r)) throw new Error("fixture profile invalid");
	return r.value;
})();

let counter = 0;
const mk = (
	credit: number,
	category: SubjectCategory,
	options: { grade?: Grade; name?: string } = {},
): Course => {
	counter += 1;
	const id = `R6${counter.toString().padStart(4, "0")}`;
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
	Array.from({ length: count }, () => mk(credit, category, options));

/**
 * R6+ 卒業要件を完全に満たす学生成績を生成。
 * 導入 18（学びかた 6 + 基軸英語 4 + 初修外国語 4 + 数理 AI 4）
 * + 教養 26（4 分野 × 2〜） + ゼミ I-II 4 + ゼミ III-IV 4
 * + 卒論ゼミ 8 + PF 30（うち 学部共通 4+） + 選択 42 = 132 単位
 */
const makeGraduatable = (): AcademicRecord => {
	counter = 0;
	const list: Course[] = [
		// 学びかた 3 科目（各 2 単位）
		mk(2, SubjectCategory.introCoreLearning(), { name: "大学基礎論" }),
		mk(2, SubjectCategory.introCoreLearning(), { name: "学問基礎論" }),
		mk(2, SubjectCategory.introCoreLearning(), {
			name: "課題探求実践セミナー",
		}),
		// 基軸英語 2 科目（各 2 単位）
		mk(2, SubjectCategory.introCoreEnglish(), { name: "大学英語入門" }),
		mk(2, SubjectCategory.introCoreEnglish(), { name: "英会話 I・II" }),
		// 初修外国語 1 言語 4 単位
		...courses(2, 2, SubjectCategory.introForeignLanguage("ドイツ語")),
		// 数理 AI 2 科目（各 2 単位）
		mk(2, SubjectCategory.introMathAi(), { name: "情報とデータリテラシー" }),
		mk(2, SubjectCategory.introMathAi(), { name: "データサイエンス入門" }),
		// 教養 7 分野（ここで全 7 分野を 1 つは登場させる。3 分野 8 単位の条件は
		// 主要 4 分野で満たし、残り 3 分野は 2 単位ずつ補完で埋める）
		...courses(2, 2, SubjectCategory.liberalGroupLife()),
		...courses(2, 2, SubjectCategory.liberalGroupArts()),
		...courses(2, 2, SubjectCategory.liberalGroupHumanitiesSocial()),
		...courses(2, 2, SubjectCategory.liberalGroupNaturalScience()),
		...courses(1, 2, SubjectCategory.liberalGroupHealthSports()),
		...courses(1, 2, SubjectCategory.liberalGroupCareer()),
		...courses(3, 2, SubjectCategory.liberalGroupComplex()),
		// ゼミ I・II 4
		...courses(2, 2, SubjectCategory.seminar12()),
		// ゼミ III・IV: 前期 2 + 後期 2
		...courses(1, 2, SubjectCategory.seminar34Spring()),
		...courses(1, 2, SubjectCategory.seminar34Fall()),
		// 卒論ゼミ 8
		...courses(4, 2, SubjectCategory.seminar56Thesis()),
		// PF 30: 学部共通 4 + 他分野 26
		...courses(2, 2, SubjectCategory.platformFacultyCommon()),
		...courses(5, 2, SubjectCategory.platformHumanities()),
		...courses(4, 2, SubjectCategory.platformGlobalStudies()),
		...courses(4, 2, SubjectCategory.platformSocialScience()),
		// 選択 42: 自コース 42
		...courses(21, 2, SubjectCategory.electiveOwnCourse()),
	];
	return AcademicRecord.of(defaultProfile, list);
};

const makeInsufficient = (): AcademicRecord => {
	counter = 0;
	const list: Course[] = [
		// 導入は全部
		mk(2, SubjectCategory.introCoreLearning(), { name: "大学基礎論" }),
		mk(2, SubjectCategory.introCoreLearning(), { name: "学問基礎論" }),
		mk(2, SubjectCategory.introCoreLearning(), {
			name: "課題探求実践セミナー",
		}),
		mk(2, SubjectCategory.introCoreEnglish(), { name: "大学英語入門" }),
		mk(2, SubjectCategory.introCoreEnglish(), { name: "英会話 I・II" }),
		...courses(2, 2, SubjectCategory.introForeignLanguage("ドイツ語")),
		mk(2, SubjectCategory.introMathAi(), { name: "情報とデータリテラシー" }),
		mk(2, SubjectCategory.introMathAi(), { name: "データサイエンス入門" }),
		// 教養不足（2 分野 × 2 単位 = 4 単位）
		...courses(1, 2, SubjectCategory.liberalGroupLife()),
		...courses(1, 2, SubjectCategory.liberalGroupArts()),
	];
	return AcademicRecord.of(defaultProfile, list);
};

export const fixtures = {
	graduatable: makeGraduatable,
	insufficient: makeInsufficient,
} as const;
