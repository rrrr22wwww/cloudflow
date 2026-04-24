type ServerSpecKey = "cpu" | "ram" | "disk" | "region" | "traffic" | "os";

export type ServerSpecs = {
  cpu: string;
  ram: string;
  disk: string;
  region: string;
  traffic: string;
  os: string;
};

const DEFAULT_SPECS: ServerSpecs = {
  cpu: "",
  ram: "",
  disk: "",
  region: "",
  traffic: "",
  os: "",
};

const SPEC_KEYS: ServerSpecKey[] = ["cpu", "ram", "disk", "region", "traffic", "os"];

export function parseServerSpecs(tags?: string[] | null): ServerSpecs {
  const specs: ServerSpecs = { ...DEFAULT_SPECS };

  for (const rawTag of tags ?? []) {
    const [rawKey, ...rest] = rawTag.split(":");
    if (!rawKey || rest.length === 0) {
      continue;
    }

    const key = rawKey.trim().toLowerCase() as ServerSpecKey;
    if (!SPEC_KEYS.includes(key)) {
      continue;
    }

    specs[key] = rest.join(":").trim();
  }

  return specs;
}

export function buildServerTags(specs: Partial<ServerSpecs>, extraTags: string[] = []) {
  const normalized = SPEC_KEYS.flatMap((key) => {
    const value = specs[key]?.trim();
    return value ? [`${key}:${value}`] : [];
  });

  return [...normalized, ...extraTags.map((tag) => tag.trim()).filter(Boolean)];
}

export function formatServerSpecs(specs: Partial<ServerSpecs>) {
  return [
    specs.cpu ? `CPU ${specs.cpu}` : null,
    specs.ram ? `RAM ${specs.ram}` : null,
    specs.disk ? `Disk ${specs.disk}` : null,
    specs.region ? `Region ${specs.region}` : null,
  ].filter(Boolean) as string[];
}

export function isSpecsFilled(specs: Partial<ServerSpecs>) {
  return Boolean(specs.cpu?.trim() && specs.ram?.trim() && specs.disk?.trim() && specs.region?.trim());
}
