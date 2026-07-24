const Joi = require('joi');

const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

exports.validateRegister = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string()
      .pattern(passwordPattern)
      .required()
      .messages({
        'string.pattern.base':
          'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
      }),
    role: Joi.string().valid('Admin', 'Manager', 'User').default('User'),
    team: Joi.string().default('Default'),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, error: messages });
  }
  next();
};

exports.validateLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email(),
    username: Joi.string().min(3),
    password: Joi.string().required(),
  }).or('email', 'username'); 

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, error: messages });
  }
  next();
};

exports.validateCreateTask = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().min(5).max(2000).required(),
    dueDate: Joi.date().greater('now').required(),
    priority: Joi.string().valid('Low', 'Medium', 'High').default('Medium'),
    status: Joi.string()
      .valid('Pending', 'In Progress', 'Completed', 'Overdue')
      .default('Pending'),
    assignedTo: Joi.string()
      .pattern(/^[a-fA-F0-9]{24}$/)
      .required()
      .messages({ 'string.pattern.base': 'assignedTo must be a valid MongoDB ObjectId' }),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res
      .status(400)
      .json({ success: false, error: error.details.map((d) => d.message) });
  }
  next();
};

exports.validateUpdateTask = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().min(3).max(200),
    description: Joi.string().min(5).max(2000),
    dueDate: Joi.date(),
    priority: Joi.string().valid('Low', 'Medium', 'High'),
    status: Joi.string().valid('Pending', 'In Progress', 'Completed', 'Overdue'),
    assignedTo: Joi.string()
      .pattern(/^[a-fA-F0-9]{24}$/)
      .messages({ 'string.pattern.base': 'assignedTo must be a valid MongoDB ObjectId' }),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res
      .status(400)
      .json({ success: false, error: error.details.map((d) => d.message) });
  }
  next();
};
