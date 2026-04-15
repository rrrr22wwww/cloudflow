export type GraphQLErrorItem = {
  message: string;
  path?: Array<string | number>;
};

export type GraphQLResponse<T> = {
  data?: T;
  errors?: GraphQLErrorItem[];
};

export type CloudflowUser = {
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

export type CloudflowAuthPayload = {
  token: string;
  user: CloudflowUser;
};

export type CloudflowProduct = {
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

const BASE_URL = (process.env.CLOUDFLOW_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

export class CloudflowApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "CloudflowApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function readPayload(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function cloudflowPing() {
  const response = await fetch(`${BASE_URL}/public/ping`, {
    cache: "no-store",
  });

  const payload = await readPayload(response);
  if (!response.ok) {
    throw new CloudflowApiError(`HTTP ${response.status}`, response.status, payload);
  }

  return payload;
}

export async function cloudflowGraphql<T>(
  query: string,
  variables: Record<string, unknown> = {},
  token?: string,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  const payload = (await readPayload(response)) as GraphQLResponse<T>;

  if (!response.ok || payload?.errors?.length) {
    const message = payload?.errors?.map((item) => item.message).join("\n") || `HTTP ${response.status}`;
    throw new CloudflowApiError(message, response.status, payload);
  }

  return payload;
}

export const CLOUD_GQL = {
  login: `
    mutation Login($email: String!, $password: String!) {
      login(email: $email, password: $password) {
        token
        user { id name email img_user role rating balance created_at updated_at }
      }
    }
  `,
  register: `
    mutation Register($name: String!, $email: String!, $img: String!, $password: String!) {
      register(name: $name, email: $email, img_user: $img, password: $password) {
        token
        user { id name email img_user role rating balance created_at updated_at }
      }
    }
  `,
  logout: `mutation Logout { logout }`,
  getProducts: `
    query GetProducts($name: String, $id: ID, $sellerID: ID) {
      getProducts(name: $name, id: $id, seller_id: $sellerID) {
        id seller_id category_id name description price rating status tags created_at updated_at
      }
    }
  `,
  setProduct: `
    mutation SetProduct(
      $sellerID: ID!
      $categoryID: Int!
      $name: String!
      $description: String!
      $price: Int!
      $rating: Float!
      $tags: [String]!
    ) {
      setProduct(
        sellerID: $sellerID
        categoryID: $categoryID
        name: $name
        description: $description
        price: $price
        rating: $rating
        tags: $tags
      ) {
        id seller_id category_id name description price rating status tags created_at updated_at
      }
    }
  `,
} as const;
