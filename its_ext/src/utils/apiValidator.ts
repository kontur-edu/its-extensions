export interface IParameterRestriction {
  name?: string;
  minValue?: number;
  exactValue?: any;
}

export interface IBodyParamRestrictions {
  [key: string]: IParameterRestriction[];
}

function checkRestriction(val: any, restriction: IParameterRestriction) {
  if (restriction.exactValue !== undefined && val !== restriction.exactValue) {
    return false;
  }
  if (restriction.minValue !== undefined && val < restriction.minValue) {
    return false;
  }
  return true;
}

export interface IApiValidatorConfig {
  bodyParamRestrictions: IBodyParamRestrictions;
  restrictedUrls: Set<string>;
  allowdMethods: Set<string>;
}

export const SAFE_API_VALIDATOR_CONFIG: IApiValidatorConfig = {
  bodyParamRestrictions: {
    "https://its.urfu.ru/EduSpace/UpdateSelectionGroup": [
      { name: "EduSpaceId", exactValue: 14 },
    ],
    "https://its.urfu.ru/MUP/AddTmer": [{ name: "id", minValue: 103 }],
    "https://its.urfu.ru/MUP/DeleteTmer": [{ name: "id", minValue: 103 }],
    "https://its.urfu.ru/MUP/UpdatePeriod": [{ name: "Id", minValue: 103 }],
    "https://its.urfu.ru/EduSpace/UpdateLimit": [{ name: "id", minValue: 124 }],
    "https://its.urfu.ru/MUPItsSubgroupMeta/Edit": [
      { name: "id", minValue: 419 },
    ],
    "https://its.urfu.ru/MUPItsSubgroup/Edit": [{ name: "Id", minValue: 470 }],
    "https://its.urfu.ru/MUPItsSubgroup/Delete": [{ minValue: 474 }],
    "https://its.urfu.ru/MUPItsAdmission/EditTestResults": [
      { name: "id", minValue: 146 },
    ],
    "https://its.urfu.ru/MUPItsAdmission/SetCompetitionGroupAdmissionStatus": [
      { name: "id", minValue: 146 },
    ],
    "https://its.urfu.ru/MUPItsSubgroup/StudentMembership": [
      { name: "subgroupId", minValue: 594 },
    ],
    "https://its.urfu.ru/EduSpace/UpdateDisciplineConnection": [
      { name: "id", minValue: 124 },
    ],
  },
  restrictedUrls: new Set<string>([
    // "https://its.urfu.ru/MUPItsSubgroup/Create",
  ]),
  allowdMethods: new Set<string>(["GET", "POST", "DELETE"]),
};

export const ALLOW_ALL_API_VALIDATOR_CONFIG: IApiValidatorConfig = {
  bodyParamRestrictions: {},
  restrictedUrls: new Set<string>([]),
  allowdMethods: new Set<string>([
    "GET",
    "POST",
    "DELETE",
    "DELETE",
    "OPTIONS",
    "HEAD",
    "PATCH",
  ]),
};

export class ApiValidator {
  constructor(public config: IApiValidatorConfig) {}

  private validateArray(
    data: Array<any>,
    restrictions: IParameterRestriction[]
  ) {
    for (const val of data) {
      for (const restriction of restrictions) {
        if (!checkRestriction(val, restriction)) {
          return false;
        }
      }
    }

    return true;
  }

  private validateObject(data: any, restrictions: IParameterRestriction[]) {
    for (const key in data) {
      for (const restriction of restrictions) {
        if (restriction.name && restriction.name === key) {
          if (!checkRestriction(data[key], restriction)) {
            return false;
          }
        }
      }
    }

    return true;
  }

  validate(method: "GET" | "POST" | "DELETE", url: string, data?: any) {
    if (!this.config.allowdMethods.has(method)) {
      return false;
    }

    const matches = url.match(
      // eslint-disable-next-line
      /^(?:(http[s]?|ftp):\/)?\/?([^:\/\s]+)((?:\/\w+)*\/?)([\w\-\.]+[^#?\s]+)?(.*)?(#[\w\-]+)?$/i
    );
    if (matches && matches.length > 3) {
      const urlBase = `${matches[1]}://${matches[2]}${matches[3]}`;
      if (this.config.restrictedUrls.has(urlBase)) {
        return false;
      }
    }

    if (this.config.restrictedUrls.has(url)) {
      return false;
    }
    if (
      method !== "GET" &&
      data &&
      this.config.bodyParamRestrictions.hasOwnProperty(url)
    ) {
      if (Array.isArray(data)) {
        return this.validateArray(
          data as Array<any>,
          this.config.bodyParamRestrictions[url]
        );
      } else {
        return this.validateObject(
          data,
          this.config.bodyParamRestrictions[url]
        );
      }
    }

    return true;
  }
}
