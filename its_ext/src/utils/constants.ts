export const PROXY_URL = "http://localhost:3000/proxy";

export const CSRF_TOKEN_INPUT_NAME = "__RequestVerificationToken";

export const LOGIN_URL = "https://its.urfu.ru/Account/Login";
export const EDU_SPACE_URL = "https://its.urfu.ru/EduSpace";
export const COMPETITION_GROUP_URL =
  "https://its.urfu.ru/MUPItsCompetitionGroups";
export const COMPETITION_GROUP_SUBGROUP_META_URL =
  "https://its.urfu.ru/MUPItsSubgroupMeta/Index?competitionGroupId=";
export const COMPETITION_GROUP_SUBGROUP_URL =
  "https://its.urfu.ru/MUPItsSubgroup/Index?competitionGroupId=";
export const MUP_PERIOD_URL = "https://its.urfu.ru/MUP/Periods/";

export const REQUEST_ERROR_UNAUTHORIZED = "REQUEST_ERROR_UNAUTHORIZED";
export const REQUEST_ERROR_REQUEST_FAILED = "REQUEST_ERROR_REQUEST_FAILED";
export const REQUEST_ERROR_REQUEST_HANDLING_ERROR =
  "REQUEST_ERROR_REQUEST_HANDLING_ERROR";
export const REQUEST_ERROR_CONNECTION_REFUSED =
  "REQUEST_ERROR_CONNECTION_REFUSED";

export const SAFE_MODE_ENABLED_MESSAGE = "Включен защищенный режим";

export const MUPS_MAX_COUNT = 300;

export const EDU_SPACES_MAX_COUNT = 300;

export const PERIOD_MAX_COUNT = 300;
export const COMPETITION_GROUP_MAX_COUNT = 300;
export const STUDENT_ADMISSIONS_MAX_COUNT = 300;

export const StepMessages = {
  selectionGroupsSelected: "Группы выбора выбраны",
  selectionGroupsSelectError: "Необходимо выбрать 2 группы выбора",
  competitionGroupsSelected: "Конкурсные группы выбраны",
  competitionGroupsSelectError: "Необходимо выбрать 2 Конкурсные группы",
};

export const MupEditorMessages = {
  needApply: "Примените изменения",
  needManualLoadEdit: "Настройте нагрузку в its.urfu.ru",
};

export const DEBOUNCE_MS = 1000;
