export interface AnimationTask {
  tick: () => boolean;
  finish?: () => void;
}

export class AnimationManager<T> {
  actions: T[] = [];
  currentTask: AnimationTask | null = null;
  convertor: (action: T) => AnimationTask | void;

  constructor(convertor: (action: T) => AnimationTask | void) {
    this.convertor = convertor;
  }

  addAction(action: T) {
    this.actions.push(action);
  }

  get isRunning() {
    return !!this.currentTask;
  }

  get isEmpty() {
    return !!this.actions.length;
  }

  setTask(task: AnimationTask | null) {
    this.currentTask = task;
  }

  runTask() {
    if (this.currentTask) {
      if (this.currentTask.tick()) return;
      this.currentTask.finish?.();
      this.setTask(null);
    } else {
      const action = this.actions.shift();
      if (!action) return;
      const task = this.convertor(action);
      if (!task) return;
      this.setTask(task);
    }
  }
}
