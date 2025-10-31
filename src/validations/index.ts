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

  churchId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.uuid': 'ID da igreja deve ser válido'
    }),

  phase: Joi.string()
    .valid('1', '2', '3', '4', '5')
    .optional()
    .messages({
      'any.only': 'Fase deve ser um valor entre 1 e 5'
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
        message: detail.message
      }));

      return res.status(400).json({
        status: 'fail',
        message: 'Dados de entrada inválidos',
        errors
      });
    }

    req.body = value;
    next();
  };
};
