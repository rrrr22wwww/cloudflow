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

export type CloudflowOrder = {
  id: string;
  buyer_id: string;
  status: string;
  total_amount: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CloudflowPurchasePayload = {
  order: CloudflowOrder;
  product: CloudflowProduct;
  buyer: CloudflowUser;
};

export type CloudflowServerAccess = {
  product_id: string;
  ip_address: string;
  ssh_username: string;
  ssh_password?: string | null;
  ssh_private_key?: string | null;
  port?: number | null;
  connection_notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CloudflowEmailLoginCodePayload = {
  challenge_id: string;
  email: string;
  expires_in: number;
};

export function isCloudflowAuthPayload(value: unknown): value is CloudflowAuthPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Partial<CloudflowAuthPayload>;
  const user = payload.user as Partial<CloudflowUser> | undefined;

  return (
    typeof payload.token === "string" &&
    payload.token.length > 0 &&
    typeof user === "object" &&
    user !== null &&
    typeof user.id === "string" &&
    typeof user.name === "string" &&
    typeof user.email === "string"
  );
}

export function isCloudflowEmailLoginCodePayload(
  value: unknown,
): value is CloudflowEmailLoginCodePayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Partial<CloudflowEmailLoginCodePayload>;

  return (
    typeof payload.challenge_id === "string" &&
    payload.challenge_id.length > 0 &&
    typeof payload.email === "string" &&
    typeof payload.expires_in === "number"
  );
}

export type CloudflowProduct = {
  id: string;
  seller_id: string;
  category_id?: number | null;
  name: string;
  description: string;
  price: number;
  rating?: number | null;
  status?: string | null;
  preview_image?: string | null;
  tags?: string[] | null;
  created_at: string;
  updated_at: string;
};

export type CloudflowSellerReview = {
  id: number;
  seller_id: string;
  buyer_id: string;
  product_id: string;
  rating: number;
  comment?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CloudflowCategory = {
  id: number;
  name: string;
  parent_id?: number | null;
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
    throw new CloudflowApiError(message, response.ok ? 502 : response.status, payload);
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
  requestEmailLoginCode: `
    mutation RequestEmailLoginCode($email: String!, $password: String!) {
      requestEmailLoginCode(email: $email, password: $password) {
        challenge_id
        email
        expires_in
      }
    }
  `,
  verifyEmailLoginCode: `
    mutation VerifyEmailLoginCode($challengeId: ID!, $code: String!) {
      verifyEmailLoginCode(challenge_id: $challengeId, code: $code) {
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
  me: `
    query Me {
      me {
        id name email img_user role rating balance created_at updated_at
      }
    }
  `,
  getUsers: `
    query GetUsers($name: String, $email: String, $id: ID) {
      getUsers(name: $name, email: $email, id: $id) {
        id name email img_user role rating balance created_at updated_at
      }
    }
  `,
  setUser: `
    mutation SetUser(
      $id: ID
      $name: String
      $email: String
      $img: String
      $role: String
      $rating: Int
      $balance: Float
    ) {
      setUser(
        id: $id
        name: $name
        email: $email
        img_user: $img
        role: $role
        rating: $rating
        balance: $balance
      ) {
        id name email img_user role rating balance created_at updated_at
      }
    }
  `,
  deleteUser: `
    mutation DeleteUser($id: ID!) {
      deleteUser(id: $id)
    }
  `,
  getProducts: `
    query GetProducts($name: String, $id: ID, $sellerID: ID) {
      getProducts(name: $name, id: $id, seller_id: $sellerID) {
        id seller_id category_id name description price rating status preview_image tags created_at updated_at
      }
    }
  `,
  updateProduct: `
    mutation UpdateProduct(
      $id: ID!
      $categoryID: Int
      $name: String
      $description: String
      $price: Float
      $rating: Int
      $status: String
      $tags: [String]
    ) {
      updateProduct(
        id: $id
        categoryID: $categoryID
        name: $name
        description: $description
        price: $price
        rating: $rating
        status: $status
        tags: $tags
      ) {
        id seller_id category_id name description price rating status preview_image tags created_at updated_at
      }
    }
  `,
  deleteProduct: `
    mutation DeleteProduct($id: ID!) {
      deleteProduct(id: $id)
    }
  `,
  getCategories: `
    query GetCategories {
      getCategories {
        id
        name
        parent_id
      }
    }
  `,
  setCategory: `
    mutation SetCategory($name: String!, $parentID: Int) {
      setCategory(name: $name, parentID: $parentID) {
        id
        name
        parent_id
      }
    }
  `,
  updateCategory: `
    mutation UpdateCategory($id: Int!, $name: String, $parentID: Int) {
      updateCategory(id: $id, name: $name, parentID: $parentID) {
        id
        name
        parent_id
      }
    }
  `,
  deleteCategory: `
    mutation DeleteCategory($id: Int!) {
      deleteCategory(id: $id)
    }
  `,
  getPurchasedProducts: `
    query GetPurchasedProducts($buyerID: ID) {
      getPurchasedProducts(buyer_id: $buyerID) {
        id seller_id category_id name description price rating status preview_image tags created_at updated_at
      }
    }
  `,
  getSellerReviews: `
    query GetSellerReviews($sellerID: ID) {
      getSellerReviews(seller_id: $sellerID) {
        id
        seller_id
        buyer_id
        product_id
        rating
        comment
        created_at
        updated_at
      }
    }
  `,
  getProductAccess: `
    query GetProductAccess($productID: ID!) {
      getProductAccess(productID: $productID) {
        product_id
        ip_address
        ssh_username
        ssh_password
        ssh_private_key
        port
        connection_notes
        created_at
        updated_at
      }
    }
  `,
  topUpBalance: `
    mutation TopUpBalance($amount: Float!) {
      topUpBalance(amount: $amount) {
        id name email img_user role rating balance created_at updated_at
      }
    }
  `,
  purchaseProduct: `
    mutation PurchaseProduct($productID: ID!, $rating: Int, $comment: String) {
      purchaseProduct(productID: $productID, rating: $rating, comment: $comment) {
        order {
          id buyer_id status total_amount created_at updated_at
        }
        product {
          id seller_id category_id name description price rating status preview_image tags created_at updated_at
        }
        buyer {
          id name email img_user role rating balance created_at updated_at
        }
      }
    }
  `,
  setProductAccess: `
    mutation SetProductAccess(
      $productID: ID!
      $ipAddress: String!
      $sshUsername: String!
      $sshPassword: String
      $sshPrivateKey: String
      $port: Int
      $connectionNotes: String
    ) {
      setProductAccess(
        productID: $productID
        ip_address: $ipAddress
        ssh_username: $sshUsername
        ssh_password: $sshPassword
        ssh_private_key: $sshPrivateKey
        port: $port
        connection_notes: $connectionNotes
      ) {
        product_id
        ip_address
        ssh_username
        ssh_password
        ssh_private_key
        port
        connection_notes
        created_at
        updated_at
      }
    }
  `,
  setProductPreviewImage: `
    mutation SetProductPreviewImage($productID: ID!, $fileName: String!) {
      setProductPreviewImage(productID: $productID, file_name: $fileName) {
        id seller_id category_id name description price rating status preview_image tags created_at updated_at
      }
    }
  `,
  setProduct: `
    mutation SetProduct(
      $sellerID: ID!
      $categoryID: Int
      $name: String!
      $description: String!
      $price: Float!
      $rating: Int
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
        id seller_id category_id name description price rating status preview_image tags created_at updated_at
      }
    }
  `,
} as const;
