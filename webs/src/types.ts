export type User = {
  id: string;
  name: string;
  email: string;
  img_user?: string | null;
  role?: string | null;
  rating?: number | null;
  balance?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Product = {
  id: string;
  seller_id: string;
  category_id?: number | null;
  name: string;
  description: string;
  price: number;
  rating?: number | null;
  status?: string | null;
  tags?: string[] | null;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: number;
  name: string;
  parent_id?: number | null;
};

export type AuthPayload = {
  token: string;
  user: User;
};

export type GraphQLErrorItem = {
  message: string;
  path?: Array<string | number>;
};

export type GraphQLResponse<T> = {
  data?: T;
  errors?: GraphQLErrorItem[];
};

export type ApiResult<T> = {
  status: number;
  ok: boolean;
  payload: T;
};
