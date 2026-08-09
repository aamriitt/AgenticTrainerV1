import { mockRequest } from "./api-client";
import { MOCK_USERS, MOCK_MODEL_STATUS, MOCK_LOGS } from "@/constants/mock-data";
import type { WorkspaceUser } from "@/types";

export const adminService = {
  getUsers: () => mockRequest(MOCK_USERS),
  getModelStatus: () => mockRequest(MOCK_MODEL_STATUS),
  getLogs: () => mockRequest(MOCK_LOGS),

  inviteUser: (input: { name: string; email: string; role: WorkspaceUser["role"] }): Promise<WorkspaceUser> =>
    mockRequest({
      id: `u-${Date.now()}`,
      name: input.name,
      email: input.email,
      role: input.role,
      status: "invited",
      lastActive: null,
    }),
};
