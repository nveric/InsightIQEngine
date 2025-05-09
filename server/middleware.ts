import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

/**
 * Middleware to ensure the user has access to the requested organization
 * This prevents users from accessing data from organizations they don't belong to
 */
export async function tenantIsolationMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip for non-authenticated requests
  if (!req.isAuthenticated()) {
    return next();
  }

  const organizationId = getOrganizationIdFromRequest(req);
  // Skip if there's no organization ID in the request
  if (!organizationId) {
    return next();
  }

  const userId = req.user!.id;

  try {
    // Check if the user is a member of the requested organization
    const membership = await storage.getOrganizationMember(organizationId, userId);
    
    if (!membership) {
      return res.status(403).json({
        error: "You don't have access to this organization's data"
      });
    }

    // Add organization and user role in the organization to the request for future use
    req.organization = await storage.getOrganization(organizationId);
    req.orgRole = membership.role;
    
    next();
  } catch (error) {
    console.error("Error in tenant isolation middleware:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Helper to extract the organization ID from the request
 * Looks for organizationId in the request body, query parameters, or URL path params
 */
function getOrganizationIdFromRequest(req: Request): number | null {
  // Check request body
  if (req.body && req.body.organizationId) {
    return parseInt(req.body.organizationId);
  }
  
  // Check query parameters
  if (req.query && req.query.organizationId) {
    return parseInt(req.query.organizationId as string);
  }
  
  // Check URL path params
  if (req.params && req.params.organizationId) {
    return parseInt(req.params.organizationId);
  }

  // Check for the organization slug in URL params and convert to ID
  if (req.params && req.params.orgSlug) {
    // This would need to be handled asynchronously, which is not possible in this function
    // Handle this case separately in specific routes that use slug
    return null;
  }
  
  return null;
}

/**
 * Middleware to enforce role-based access control within an organization
 * @param requiredRoles Array of roles that are allowed to access the resource
 */
export function roleCheckMiddleware(requiredRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip for non-authenticated requests
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Skip if there's no organization context established
    if (!req.organization || !req.orgRole) {
      return res.status(400).json({ error: "Organization context is required" });
    }

    // Check if the user's role is in the list of required roles
    if (requiredRoles.includes(req.orgRole)) {
      next();
    } else {
      res.status(403).json({
        error: `This action requires one of the following roles: ${requiredRoles.join(', ')}`
      });
    }
  };
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      organization?: any;
      orgRole?: string;
    }
  }
}