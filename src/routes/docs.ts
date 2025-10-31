// Imports
import { Router, Request, Response } from 'express';

// Configuration
const router = Router();

// API Documentation
router.get('/', (req: Request, res: Response) => {
  const apiDocs = {
    title: "MSA App API",
    version: "1.0.0",
    description: "API para sistema de gestão de igrejas MSA",
    baseUrl: `${req.protocol}://${req.get('host')}/api`,
    endpoints: {
      auth: {
        login: {
          method: "POST",
          path: "/auth/login",
          description: "Fazer login no sistema",
          body: {
            email: "string (required)",
            password: "string (required)"
          },
          responses: {
            200: "Login realizado com sucesso",
            401: "Email ou senha incorretos"
          }
        },
        register: {
          method: "POST",
          path: "/auth/register",
          description: "Registrar novo usuário",
          body: {
            name: "string (required)",
            email: "string (required)",
            password: "string (required)",
            role: "string (optional)",
            churchId: "string (required)"
          },
          responses: {
            201: "Solicitação enviada com sucesso",
            409: "Email já cadastrado"
          }
        },
        verify: {
          method: "GET",
          path: "/auth/verify",
          description: "Verificar token JWT",
          headers: {
            Authorization: "Bearer <token>"
          },
          responses: {
            200: "Token válido",
            401: "Token inválido"
          }
        }
      },
      users: {
        list: {
          method: "GET",
          path: "/users",
          description: "Listar usuários",
          query: {
            churchId: "string (optional)",
            role: "string (optional)",
            take: "number (optional)"
          },
          headers: {
            Authorization: "Bearer <token>"
          },
          responses: {
            200: "Lista de usuários"
          }
        },
        getById: {
          method: "GET",
          path: "/users/:id",
          description: "Obter usuário por ID",
          headers: {
            Authorization: "Bearer <token>"
          },
          responses: {
            200: "Dados do usuário",
            404: "Usuário não encontrado"
          }
        },
        create: {
          method: "POST",
          path: "/users",
          description: "Criar novo usuário",
          headers: {
            Authorization: "Bearer <token>"
          },
          body: {
            name: "string (required)",
            email: "string (required)",
            password: "string (required)",
            role: "string (optional)",
            churchId: "string (optional)",
            phase: "string (optional)"
          },
          responses: {
            201: "Usuário criado",
            409: "Email já cadastrado"
          }
        },
        update: {
          method: "PUT",
          path: "/users/:id",
          description: "Atualizar usuário",
          headers: {
            Authorization: "Bearer <token>"
          },
          body: {
            name: "string (optional)",
            email: "string (optional)",
            password: "string (optional)",
            role: "string (optional)",
            churchId: "string (optional)",
            phase: "string (optional)"
          },
          responses: {
            200: "Usuário atualizado"
          }
        },
        delete: {
          method: "DELETE",
          path: "/users/:id",
          description: "Desativar usuário",
          headers: {
            Authorization: "Bearer <token>"
          },
          responses: {
            200: "Usuário desativado"
          }
        },
        entryRequests: {
          list: {
            method: "GET",
            path: "/users/entry-requests",
            description: "Listar solicitações de entrada (apenas encarregados)",
            headers: {
              Authorization: "Bearer <token>"
            },
            responses: {
              200: "Lista de solicitações",
              403: "Acesso negado"
            }
          },
          approve: {
            method: "POST",
            path: "/users/entry-requests/:id/approve",
            description: "Aprovar solicitação de entrada (apenas encarregados)",
            headers: {
              Authorization: "Bearer <token>"
            },
            responses: {
              200: "Solicitação aprovada",
              403: "Acesso negado",
              404: "Solicitação não encontrada"
            }
          }
        }
      },
      churches: {
        list: {
          method: "GET",
          path: "/churchs",
          description: "Listar igrejas",
          responses: {
            200: "Lista de igrejas"
          }
        },
        getById: {
          method: "GET",
          path: "/churchs/:id",
          description: "Obter igreja por ID",
          responses: {
            200: "Dados da igreja",
            404: "Igreja não encontrada"
          }
        },
        create: {
          method: "POST",
          path: "/churchs",
          description: "Criar nova igreja (apenas administradores)",
          headers: {
            Authorization: "Bearer <token>"
          },
          body: {
            name: "string (required)",
            description: "string (optional)",
            address: "string (optional)",
            phone: "string (optional)",
            email: "string (optional)"
          },
          responses: {
            201: "Igreja criada",
            403: "Acesso negado"
          }
        },
        update: {
          method: "PUT",
          path: "/churchs/:id",
          description: "Atualizar igreja (apenas administradores)",
          headers: {
            Authorization: "Bearer <token>"
          },
          body: {
            name: "string (optional)",
            description: "string (optional)",
            address: "string (optional)",
            phone: "string (optional)",
            email: "string (optional)"
          },
          responses: {
            200: "Igreja atualizada",
            403: "Acesso negado"
          }
        },
        delete: {
          method: "DELETE",
          path: "/churchs/:id",
          description: "Desativar igreja (apenas administradores)",
          headers: {
            Authorization: "Bearer <token>"
          },
          responses: {
            200: "Igreja desativada",
            403: "Acesso negado"
          }
        }
      },
      uploads: {
        avatar: {
          method: "POST",
          path: "/uploads/avatar",
          description: "Fazer upload de avatar",
          headers: {
            Authorization: "Bearer <token>",
            "Content-Type": "multipart/form-data"
          },
          body: {
            avatar: "file (image, max 5MB)"
          },
          responses: {
            200: "Avatar atualizado",
            400: "Arquivo inválido"
          }
        },
        getAvatar: {
          method: "GET",
          path: "/uploads/avatars/:filename",
          description: "Obter arquivo de avatar",
          responses: {
            200: "Arquivo de imagem",
            404: "Arquivo não encontrado"
          }
        }
      },
      health: {
        check: {
          method: "GET",
          path: "/health",
          description: "Verificar status do sistema",
          responses: {
            200: "Status saudável",
            503: "Serviço indisponível"
          }
        }
      }
    },
    roles: {
      ADMINISTRADOR: "Acesso total ao sistema",
      INSTRUTOR: "Pode gerenciar aprendizes",
      ENCARREGADO: "Pode aprovar solicitações de entrada",
      APRENDIZ: "Acesso básico, precisa de aprovação"
    },
    rateLimit: {
      windowMs: "15 minutos",
      maxRequests: "100 requisições por IP"
    }
  };

  res.json(apiDocs);
});

export default router;
