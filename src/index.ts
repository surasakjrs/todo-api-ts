import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';
import { Todo } from './types';
import { createTodoSchema, updateTodoSchema, listQuerySchema } from './validators';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// In-memory store (no database)
const todos: Todo[] = [];

// Helper: pagination + filtering + sorting
app.get('/todos', (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = listQuerySchema.parse(req.query);
    const {
      q, status, priority, sortBy = 'createdAt', order = 'desc',
      page = 1, pageSize = 20
    } = parsed;

    let result = [...todos];

    if (q) {
      const needle = q.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(needle) ||
        (t.description ?? '').toLowerCase().includes(needle)
      );
    }
    if (status) result = result.filter(t => t.status === status);
    if (priority) result = result.filter(t => t.priority === priority);

    result.sort((a, b) => {
      const dir = order === 'asc' ? 1 : -1;
      const av = (a as any)[sortBy];
      const bv = (b as any)[sortBy];

      if (av == null && bv == null) return 0;
      if (av == null) return 1; // nulls last
      if (bv == null) return -1;

      if (sortBy === 'priority') {
        return (av - bv) * dir;
      }
      return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
    });

    const total = result.length;
    const start = (page - 1) * pageSize;
    const data = result.slice(start, start + pageSize);

    res.json({ data, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    next(err);
  }
});

// Create
app.post('/todos', (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createTodoSchema.parse(req.body);
    const now = new Date().toISOString();
    const todo: Todo = {
      id: uuid(),
      title: input.title,
      description: input.description,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      dueDate: input.dueDate,
      priority: input.priority
    };
    todos.push(todo);
    res.status(201).json(todo);
  } catch (err) {
    next(err);
  }
});

// Read one
app.get('/todos/:id', (req, res) => {
  const todo = todos.find(t => t.id === req.params.id);
  if (!todo) return res.status(404).json({ message: 'Not found' });
  res.json(todo);
});

// Update (partial)
app.patch('/todos/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const idx = todos.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Not found' });

    const patch = updateTodoSchema.parse(req.body);
    const current = todos[idx];

    const updated: Todo = {
      ...current,
      ...patch,
      dueDate: patch.dueDate === null ? undefined : patch.dueDate ?? current.dueDate,
      priority: (patch.priority === null ? undefined : patch.priority) as any,
      updatedAt: new Date().toISOString()
    };

    todos[idx] = updated;
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Replace (PUT)
app.put('/todos/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    // enforce full shape via create schema + status optional default
    const body = { ...req.body };
    if (!('status' in body)) body.status = 'pending';
    const createChecked = createTodoSchema.extend({
      status: updateTodoSchema.shape.status.default('pending')
    }).parse(body);

    const idx = todos.findIndex(t => t.id === req.params.id);
    const now = new Date().toISOString();
    const replacement: Todo = {
      id: idx === -1 ? req.params.id : todos[idx].id,
      title: createChecked.title,
      description: createChecked.description,
      status: (createChecked as any).status,
      createdAt: idx === -1 ? now : todos[idx].createdAt,
      updatedAt: now,
      dueDate: createChecked.dueDate,
      priority: createChecked.priority
    };

    if (idx === -1) todos.push(replacement);
    else todos[idx] = replacement;

    res.status(idx === -1 ? 201 : 200).json(replacement);
  } catch (err) {
    next(err);
  }
});

// Delete
app.delete('/todos/:id', (req, res) => {
  const idx = todos.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  const [removed] = todos.splice(idx, 1);
  res.json(removed);
});

// Quick actions
app.post('/todos/:id/done', (req, res) => {
  const todo = todos.find(t => t.id === req.params.id);
  if (!todo) return res.status(404).json({ message: 'Not found' });
  todo.status = 'done';
  todo.updatedAt = new Date().toISOString();
  res.json(todo);
});

app.post('/todos/:id/pending', (req, res) => {
  const todo = todos.find(t => t.id === req.params.id);
  if (!todo) return res.status(404).json({ message: 'Not found' });
  todo.status = 'pending';
  todo.updatedAt = new Date().toISOString();
  res.json(todo);
});

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

// Error handler (Zod + generic)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.issues) {
    return res.status(400).json({
      message: 'Validation error',
      issues: err.issues
    });
  }
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✅ ToDo API running on http://localhost:${PORT}`);
});
