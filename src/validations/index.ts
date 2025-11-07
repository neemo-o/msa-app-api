import Joi from 'joi';

// User validations
export const createUserValidation = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.empty': 'Nome é obrigatório',
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 100 caracteres',
      'any.required': 'Nome é obrigatório'
    }),

  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Email deve ser válido',
      'string.empty': 'Email é obrigatório',
      'any.required': 'Email é obrigatório'
    }),

  password: Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
      'string.min': 'Senha deve ter pelo menos 6 caracteres',
      'string.max': 'Senha deve ter no máximo 128 caracteres',
      'string.empty': 'Senha é obrigatória',
      'any.required': 'Senha é obrigatória'
    }),

  role: Joi.string()
    .valid('ADMINISTRADOR', 'INSTRUTOR', 'ENCARREGADO', 'APRENDIZ')
    .optional()
    .messages({
      'any.only': 'Função deve ser ADMINISTRADOR, INSTRUTOR, ENCARREGADO ou APRENDIZ'
    }),

  churchId: Joi.string()
    .uuid()
    .when('role', {
      is: Joi.valid('ADMINISTRADOR'),
      then: Joi.optional(),
      otherwise: Joi.required()
    })
    .messages({
      'string.uuid': 'ID da igreja deve ser válido',
      'any.required': 'Igreja é obrigatória para este tipo de usuário'
    }),

  phase: Joi.string()
    .valid('1', '2', '3', '4', '5')
    .optional()
    .default('1')
    .messages({
      'any.only': 'Fase deve ser um valor entre 1 e 5'
    }),

  status: Joi.string()
    .valid('PENDING', 'APPROVED', 'REJECTED', 'REMOVED')
    .optional()
    .default('PENDING')
    .messages({
      'any.only': 'Status deve ser PENDING, APPROVED, REJECTED ou REMOVED'
    })
});

export const updateUserValidation = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .optional()
    .messages({
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 100 caracteres'
    }),

  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .optional()
    .messages({
      'string.email': 'Email deve ser válido'
    }),

  password: Joi.string()
    .min(6)
    .max(128)
    .optional()
    .messages({
      'string.min': 'Senha deve ter pelo menos 6 caracteres',
      'string.max': 'Senha deve ter no máximo 128 caracteres'
    }),

  role: Joi.string()
    .valid('ADMINISTRADOR', 'INSTRUTOR', 'ENCARREGADO', 'APRENDIZ')
    .optional()
    .messages({
      'any.only': 'Função deve ser ADMINISTRADOR, INSTRUTOR, ENCARREGADO ou APRENDIZ'
    }),

  churchId: Joi.alternatives()
    .try(
      Joi.string().uuid(),
      Joi.allow(null)
    )
    .optional()
    .messages({
      'string.uuid': 'ID da igreja deve ser válido',
      'alternatives.match': 'ID da igreja deve ser válido ou null'
    }),

  phase: Joi.string()
    .valid('1', '2', '3', '4', '5')
    .optional()
    .messages({
      'any.only': 'Fase deve ser um valor entre 1 e 5'
    }),

  status: Joi.string()
    .valid('PENDING', 'APPROVED', 'REJECTED', 'REMOVED')
    .optional()
    .messages({
      'any.only': 'Status deve ser PENDING, APPROVED, REJECTED ou REMOVED'
    })
});

// Auth validations
export const loginValidation = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Email deve ser válido',
      'string.empty': 'Email é obrigatório',
      'any.required': 'Email é obrigatório'
    }),

  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Senha é obrigatória',
      'any.required': 'Senha é obrigatória'
    })
});

export const registerValidation = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.empty': 'Nome é obrigatório',
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 100 caracteres',
      'any.required': 'Nome é obrigatório'
    }),

  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Email deve ser válido',
      'string.empty': 'Email é obrigatório',
      'any.required': 'Email é obrigatório'
    }),

  password: Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
      'string.min': 'Senha deve ter pelo menos 6 caracteres',
      'string.max': 'Senha deve ter no máximo 128 caracteres',
      'string.empty': 'Senha é obrigatória',
      'any.required': 'Senha é obrigatória'
    }),

  role: Joi.string()
    .valid('ADMINISTRADOR', 'INSTRUTOR', 'ENCARREGADO', 'APRENDIZ')
    .optional()
    .default('APRENDIZ')
    .messages({
      'any.only': 'Função deve ser ADMINISTRADOR, INSTRUTOR, ENCARREGADO ou APRENDIZ'
    }),

  churchId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'ID da igreja deve ser válido',
      'string.empty': 'Igreja é obrigatória',
      'any.required': 'Igreja é obrigatória'
    })
});

// Church validations
export const createChurchValidation = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.empty': 'Nome da igreja é obrigatório',
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 100 caracteres',
      'any.required': 'Nome da igreja é obrigatório'
    }),

  description: Joi.string()
    .max(500)
    .trim()
    .optional()
    .allow('')
    .messages({
      'string.max': 'Descrição deve ter no máximo 500 caracteres'
    }),

  address: Joi.string()
    .max(200)
    .trim()
    .optional()
    .allow('')
    .messages({
      'string.max': 'Endereço deve ter no máximo 200 caracteres'
    }),

  phone: Joi.string()
    .pattern(/^[\+]?[1-9][\d]{0,15}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Telefone deve ser válido'
    }),

  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .optional()
    .allow('')
    .messages({
      'string.email': 'Email deve ser válido'
    })
});

export const updateChurchValidation = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .optional()
    .messages({
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 100 caracteres'
    }),

  description: Joi.string()
    .max(500)
    .trim()
    .optional()
    .allow('')
    .messages({
      'string.max': 'Descrição deve ter no máximo 500 caracteres'
    }),

  address: Joi.string()
    .max(200)
    .trim()
    .optional()
    .allow('')
    .messages({
      'string.max': 'Endereço deve ter no máximo 200 caracteres'
    }),

  phone: Joi.string()
    .pattern(/^[\+]?[1-9][\d]{0,15}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Telefone deve ser válido'
    }),

  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .optional()
    .allow('')
    .messages({
      'string.email': 'Email deve ser válido'
    })
});

// Middleware function to validate requests
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map((detail: any) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
        type: detail.type
      }));

      // Log detalhado para desenvolvimento
      console.error('❌ Erro de validação:', {
        endpoint: req.path,
        method: req.method,
        body: req.body,
        errors: errors.map(e => ({
          field: e.field,
          message: e.message,
          value: e.value,
          type: e.type
        }))
      });

      // Mensagem amigável para o usuário
      const userFriendlyErrors = errors.map((detail: any) => {
        const field = detail.field;
        const message = detail.message;

        // Mapeamento de mensagens amigáveis
        switch (field) {
          case 'name':
            return 'Nome deve ter entre 2 e 100 caracteres';
          case 'email':
            return 'Email deve ser válido';
          case 'password':
            return 'Senha deve ter pelo menos 6 caracteres';
          case 'churchId':
            return 'Selecione uma igreja válida';
          case 'role':
            return 'Selecione uma função válida';
          default:
            return message;
        }
      });

      return res.status(400).json({
        status: 'fail',
        message: 'Verifique os dados informados',
        errors: userFriendlyErrors,
        details: process.env.NODE_ENV === 'development' ? errors : undefined
      });
    }

    req.body = value;
    next();
  };
};
