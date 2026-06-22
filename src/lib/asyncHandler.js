/**
 * @param {(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => Promise<unknown>} fn
 * @returns {(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void}
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    /**
     * @param {Error} err
     */
    const nextFn = (err) => {
      if (err) {
        return next(err);
      }
    };

    Promise.resolve(fn(req, res, next))
      .then(() => {})
      .catch(nextFn);
  };
}
