import { api } from '../../../services/api';

export interface UserRoleItem {
  id: string;
  name: string;
  description?: string;
}

export interface UserCompany {
  id: string;
  code: string;
  name: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  roles: UserRoleItem[];
  companies: UserCompany[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  email: string;
  name: string;
  password: string;
  roleIds: string[];
  /** Required for a super administrator; ignored for a plain administrator. */
  companyId?: string;
}

export interface UpdateUserData {
  email?: string;
  name?: string;
  password?: string;
  isActive?: boolean;
}

export const usersApi = {
  getUsers: async (): Promise<UserResponse[]> => {
    const res = await api.get<UserResponse[]>('/users');
    return res.data;
  },

  getUserById: async (id: string): Promise<UserResponse> => {
    const res = await api.get<UserResponse>(`/users/${id}`);
    return res.data;
  },

  createUser: async (data: CreateUserData): Promise<UserResponse> => {
    const res = await api.post<UserResponse>('/users', data);
    return res.data;
  },

  updateUser: async (
    id: string,
    data: UpdateUserData,
  ): Promise<UserResponse> => {
    const res = await api.patch<UserResponse>(`/users/${id}`, data);
    return res.data;
  },

  deleteUser: async (id: string): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/users/${id}`);
    return res.data;
  },

  assignRole: async (userId: string, roleId: string): Promise<UserResponse> => {
    const res = await api.post<UserResponse>(`/users/${userId}/roles`, {
      roleId,
    });
    return res.data;
  },

  removeRole: async (userId: string, roleId: string): Promise<UserResponse> => {
    const res = await api.delete<UserResponse>(
      `/users/${userId}/roles/${roleId}`,
    );
    return res.data;
  },

  getRoles: async (): Promise<UserRoleItem[]> => {
    const res = await api.get<UserRoleItem[]>('/users/roles');
    return res.data;
  },
};
