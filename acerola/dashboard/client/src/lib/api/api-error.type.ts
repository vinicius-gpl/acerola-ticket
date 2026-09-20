/** O formato único de erro da API, definido pelo filtro global do Nest. */
export type ApiErrorBody = {
  statusCode: number;
  message: string;
  details?: { field: string; message: string }[];
  path: string;
  timestamp: string;
};
