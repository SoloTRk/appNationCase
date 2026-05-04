export class ApiResponse {
  static success<T>(data: T, meta?: Record<string, unknown>) {
    return {
      success: true as const,
      data,
      ...(meta && { meta }),
    };
  }

  static paginated<T>(items: T[], pagination: { nextCursor: string | null; hasMore: boolean }) {
    return {
      success: true as const,
      data: items,
      pagination,
    };
  }

  static error(message: string, details?: unknown) {
    const error: { message: string; details?: unknown } = { message };
    if (details !== undefined) error.details = details;
    return { success: false as const, error };
  }
}
