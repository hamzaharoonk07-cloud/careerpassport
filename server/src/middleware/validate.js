import { ApiError } from '../utils/ApiError.js';

/**
 * Runs a Zod schema against part of the request and replaces it with the
 * parsed result, so controllers only ever see validated, coerced data.
 *
 * Field errors come back keyed by field name so the client can render
 * them inline rather than as one blob.
 */
export const validate =
  (schema, source = 'body') =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || source;
        if (!details[key]) details[key] = issue.message;
      }
      return next(ApiError.badRequest('Please check the highlighted fields.', details));
    }
    req[source] = result.data;
    next();
  };
