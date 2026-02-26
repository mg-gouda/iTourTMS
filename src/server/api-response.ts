import { NextResponse } from "next/server";

interface SuccessEnvelope<T> {
  success: true;
  data: T;
}

interface PaginatedEnvelope<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(
    { success: true, data } satisfies SuccessEnvelope<T>,
    { status },
  );
}

export function apiPaginated<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
) {
  return NextResponse.json(
    {
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    } satisfies PaginatedEnvelope<T>,
    { status: 200 },
  );
}

export function apiError(code: string, message: string, status: number) {
  return NextResponse.json(
    { success: false, error: { code, message } } satisfies ErrorEnvelope,
    { status },
  );
}
