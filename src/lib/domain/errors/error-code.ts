export const ErrorCode = {
	CreditNegative: "DEGREE_AUDIT/CREDIT/NEGATIVE",
	CreditNonFinite: "DEGREE_AUDIT/CREDIT/NON_FINITE",
	CourseIdEmpty: "DEGREE_AUDIT/COURSE_ID/EMPTY",
	GpaInvalidScore: "DEGREE_AUDIT/GPA/INVALID_SCORE",
	CourseInvalidName: "DEGREE_AUDIT/COURSE/INVALID_NAME",
	StudentProfileInvalid: "DEGREE_AUDIT/STUDENT_PROFILE/INVALID",
	RuleSetNotFound: "DEGREE_AUDIT/RULESET/NOT_FOUND",
	RuleSetAmbiguous: "DEGREE_AUDIT/RULESET/AMBIGUOUS",
	UnsupportedFileFormat: "DEGREE_AUDIT/IMPORT/UNSUPPORTED_FILE_FORMAT",
	ImportFileReadFailed: "DEGREE_AUDIT/IMPORT/FILE_READ_FAILED",
	NavigationFailed: "DEGREE_AUDIT/UI/NAVIGATION_FAILED",
} as const satisfies Record<string, `DEGREE_AUDIT/${string}`>;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
