// Imports
import { Router, Request, Response } from "express";
import { PrismaClient, UserRole } from "@prisma/client";

// Configuration
const prisma = new PrismaClient();
const router = Router();


// Routes
router.get('/', async (req: Request, res: Response) => {
    try {
        const { churchId, role, take } = req.query;
        const where: any = { isActive: true };

         if (churchId) where.churchId = churchId;
         if (role) where.role = role;

         const users = await prisma.user.findMany({
           where,
           take: take ? parseInt(take as string) : undefined,
           select: {
             id: true,
             name: true,
             email: true,
             role: true,
             avatar: true,
             churchId: true,
             phase: true,
           },
         });

         res.json({ users });
    } catch (error) {
        console.log("Erro ao buscar usuários:", error);
        res.status(500).json({ error: "Erro ao buscar usuários" });
    }
});


export default router;