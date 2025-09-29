export type TodoStatus = 'pending' | 'done';

export interface Todo {
  id: string;
  title: string;
  description?: string;
  status: TodoStatus;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  priority?: 1 | 2 | 3;
}
