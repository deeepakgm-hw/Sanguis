import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/rbac";
import { validate } from "../middlewares/validate";
import { UserRole } from "../models/User";
import { z } from "zod";

interface RouterOptions {
  controllers: {
    create: any;
    getAll: any;
    getById: any;
    update: any;
    delete: any;
  };
  validationSchemas?: {
    create?: z.AnyZodObject;
    update?: z.AnyZodObject;
  };
  roles?: {
    create?: UserRole[];
    read?: UserRole[];
    update?: UserRole[];
    delete?: UserRole[];
  };
  requireAuthentication?: boolean;
}

/**
 * Router factory to automatically map generated CRUD controllers to standard Express endpoints.
 * Injectable with authentication requirements, Zod schemas, and RBAC role protections.
 */
export function createCrudRouter(options: RouterOptions): Router {
  const router = Router();
  const {
    controllers,
    validationSchemas = {},
    roles = {},
    requireAuthentication = true,
  } = options;

  const getMiddlewares = (actionRoles?: UserRole[]) => {
    const list: any[] = [];
    if (requireAuthentication) {
      list.push(requireAuth);
    }
    if (actionRoles && actionRoles.length > 0) {
      list.push(requireRole(...actionRoles));
    }
    return list;
  };

  // 1. Create Record: POST /
  const createMiddlewares = [...getMiddlewares(roles.create)];
  if (validationSchemas.create) {
    createMiddlewares.push(validate(validationSchemas.create));
  }
  router.post("/", ...createMiddlewares, controllers.create);

  // 2. Get All Records: GET /
  router.get("/", ...getMiddlewares(roles.read), controllers.getAll);

  // 3. Get Single Record: GET /:id
  router.get("/:id", ...getMiddlewares(roles.read), controllers.getById);

  // 4. Update Record: PATCH /:id
  const updateMiddlewares = [...getMiddlewares(roles.update)];
  if (validationSchemas.update) {
    updateMiddlewares.push(validate(validationSchemas.update));
  }
  router.patch("/:id", ...updateMiddlewares, controllers.update);

  // 5. Delete Record: DELETE /:id
  router.delete("/:id", ...getMiddlewares(roles.delete), controllers.delete);

  return router;
}
