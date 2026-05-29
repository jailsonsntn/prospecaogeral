// Todas as 48 colunas na ordem exata solicitada
export const ALL_COLUMNS = [
  "uf", "cep", "qsa", "cnpj", "pais", "email", "porte", "bairro", "numero",
  "ddd_fax", "municipio", "logradouro", "cnae_fiscal", "codigo_pais",
  "complemento", "codigo_porte", "razao_social", "nome_fantasia",
  "capital_social", "ddd_telefone_1", "ddd_telefone_2", "opcao_pelo_mei",
  "codigo_municipio", "cnaes_secundarios", "natureza_juridica",
  "regime_tributario", "situacao_especial", "opcao_pelo_simples",
  "situacao_cadastral", "data_opcao_pelo_mei", "data_exclusao_do_mei",
  "cnae_fiscal_descricao", "codigo_municipio_ibge", "data_inicio_atividade",
  "data_situacao_especial", "data_opcao_pelo_simples", "data_situacao_cadastral",
  "nome_cidade_no_exterior", "codigo_natureza_juridica",
  "data_exclusao_do_simples", "motivo_situacao_cadastral",
  "ente_federativo_responsavel", "identificador_matriz_filial",
  "qualificacao_do_responsavel", "descricao_situacao_cadastral",
  "descricao_tipo_de_logradouro", "descricao_motivo_situacao_cadastral",
  "descricao_identificador_matriz_filial",
] as const;

export type ColumnKey = (typeof ALL_COLUMNS)[number];

export const PRIORITY_COLS: ColumnKey[] = [
  "cnpj", "razao_social", "nome_fantasia",
  "ddd_telefone_1", "ddd_telefone_2", "email",
  "situacao_cadastral",
  "uf", "municipio", "bairro", "cep",
  "cnae_fiscal", "cnae_fiscal_descricao",
  "porte", "data_inicio_atividade",
];

export const CONTACT_COLS: readonly string[] = [
  "ddd_telefone_1", "ddd_telefone_2", "ddd_fax", "email",
];

export type CnpjData = Record<string, unknown>;

export function normalizeCnpj(value: string): string {
  return value.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

export function maskCnpj(cnpj: string): string {
  const v = normalizeCnpj(cnpj);
  if (v.length !== 14) return v;
  return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}`;
}

export function serializeValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

export function normalizeRow(raw: CnpjData): Record<string, string> {
  const row: Record<string, string> = {};
  for (const col of ALL_COLUMNS) {
    row[col] = serializeValue(raw[col]);
  }
  return row;
}

export function toCsv(rows: CnpjData[]): string {
  const header = ALL_COLUMNS.join(",");
  const lines = rows.map((row) => {
    const norm = normalizeRow(row);
    return ALL_COLUMNS.map((col) => `"${(norm[col] ?? "").replace(/"/g, '""')}"`).join(",");
  });
  return [header, ...lines].join("\r\n");
}

export function downloadCsv(rows: CnpjData[], filename: string): void {
  const csv = "\uFEFF" + toCsv(rows); // BOM para Excel abrir corretamente
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function countContacts(rows: CnpjData[]): {
  withPhone: number;
  withEmail: number;
  withAny: number;
} {
  let withPhone = 0, withEmail = 0, withAny = 0;
  for (const row of rows) {
    const hasPhone = Boolean(
      serializeValue(row.ddd_telefone_1).trim() ||
      serializeValue(row.ddd_telefone_2).trim()
    );
    const hasEmail = Boolean(serializeValue(row.email).trim());
    const hasFax   = Boolean(serializeValue(row.ddd_fax).trim());
    if (hasPhone) withPhone++;
    if (hasEmail) withEmail++;
    if (hasPhone || hasEmail || hasFax) withAny++;
  }
  return { withPhone, withEmail, withAny };
}
