import React from "react";
import {
    IStudentAdmission
} from '../common/types';

import {
    IStudentAdmissionDistributionItem,
    IMupDistributionItem,
} from "../studentAdmission/studentDistributor";


type IPnToStudentItem = {
    [key: string]: IStudentAdmissionDistributionItem;
  };
type IMupIdToMupItem = { [key: string]: IMupDistributionItem };

describe("fillDistributionByStudentRatingAndAdmissionPriority", () => {
  it("distributes student to mup", () => {
    const admissions: IStudentAdmission[] = [
        {
            admissionId: 1,
            priority: 1, testResult: null, status: 0,
        },
        {
            admissionId: 1,
            priority: 1, testResult: null, status: 1,
        },
    ];
    const personalNumberToStudentItem: IPnToStudentItem  = {
        's1': {
            admissions: [],
            currentZ: 0,
            admittedMupIds: [],
        }
    };
    const mupIdToMupItem: IMupIdToMupItem = {
        'm1': {
            limit: 1,
            count: 0
        } 
    };
  });
});
