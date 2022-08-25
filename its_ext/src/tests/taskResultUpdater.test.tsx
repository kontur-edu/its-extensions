import { ActionType } from "../common/actions";
import {
  AdmissionInfo,
  IStudent,
  IStudentAdmission,
  IStudentData,
} from "../common/types";
import { createTaskResultActions } from "../taskResultUpdater/actionCreator";
import { UpdateTaskResultAction } from "../taskResultUpdater/actions";

describe("createTaskResultActions", () => {
  const students: IStudent[] = [
    {
      id: "s1",
      personalNumber: "pn1",
      groupName: "g1",
      surname: "s",
      firstname: "f",
      patronymic: "p",
      rating: 1,
      status: "Активный",
      competitionGroupId: 1,
    },
  ];
  const studentData: IStudentData = {
    ids: ["pn1", "pn2"],
    data: {
      pn1: students[0],
      pn2: { ...students[0], id: "s2", personalNumber: "pn2" },
    },
  };
  const studentAdmissions: IStudentAdmission[] = [
    {
      admissionId: 1,
      priority: 1,
      testResult: null,
      status: 0,
    },
  ];
  // const admissionInfo: AdmissionInfo = {
  //   1: {
  //     pn1: studentAdmissions[0],
  //   },
  //   2: {
  //     pn1: { ...studentAdmissions[0], testResult: 0 },
  //   },
  // };

  it("finds correct admission id", () => {
    const testAdmissionInfo: AdmissionInfo = {
      1: {},
      2: {
        pn1: { ...studentAdmissions[0], admissionId: 2 },
      },
    };
    const actualResult = createTaskResultActions(
      [1, 2],
      { pn1: 1 },
      testAdmissionInfo,
      studentData
    );

    expect(actualResult.length).toBe(1);
    expect(actualResult[0].actionType).toBe(ActionType.UpdateTaskResult);
    const updateTaskResultAction = actualResult[0] as UpdateTaskResultAction;
    expect(updateTaskResultAction.admissionId).toBe(2);
  });

  it("creates action if task result is different", () => {
    const testAdmissionInfo: AdmissionInfo = {
      1: {
        pn1: studentAdmissions[0],
      },
    };
    const actualResult = createTaskResultActions(
      [1],
      { pn1: 1 },
      testAdmissionInfo,
      studentData
    );

    expect(actualResult.length).toBe(1);
    expect(actualResult[0].actionType).toBe(ActionType.UpdateTaskResult);
    const updateTaskResultAction = actualResult[0] as UpdateTaskResultAction;
    expect(updateTaskResultAction.admissionId).toBe(1);
    expect(updateTaskResultAction.taskResult).toBe(1);
  });

  it("creates no actions if task result is the same", () => {
    const testAdmissionInfo: AdmissionInfo = {
      1: {
        pn1: { ...studentAdmissions[0], testResult: 1 },
      },
    };
    const actualResult = createTaskResultActions(
      [1],
      { pn1: 1 },
      testAdmissionInfo,
      studentData
    );

    expect(actualResult.length).toBe(0);
  });

  it("creates actions if some results different", () => {
    const testStudentData: IStudentData = {
      ids: ["pn1", "pn2", "pn3", "pn4"],
      data: {
        pn1: students[0],
        pn2: { ...students[0], id: "s2", personalNumber: "pn2" },
        pn3: { ...students[0], id: "s3", personalNumber: "pn3" },
        pn4: { ...students[0], id: "s4", personalNumber: "pn4" },
      },
    };
    const testAdmissionInfo: AdmissionInfo = {
      1: {
        pn1: { ...studentAdmissions[0], testResult: 1 },
        pn2: { ...studentAdmissions[0], testResult: 0 },
      },
      2: {
        pn3: { ...studentAdmissions[0], testResult: 0, admissionId: 2 },
        pn4: { ...studentAdmissions[0], testResult: 1, admissionId: 2 },
      },
    };
    const actualResult = createTaskResultActions(
      [1, 2],
      { pn1: 1, pn2: 1, pn3: 0, pn4: 0 },
      testAdmissionInfo,
      testStudentData
    );

    expect(actualResult.length).toBe(2);
  });
});
