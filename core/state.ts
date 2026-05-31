export type StateListener = (newValue: any, oldValue: any) => void;

export class AppState {
  private data: Map<string, any> = new Map();
  private listeners: Map<string, StateListener[]> = new Map();

  public get(key: string): any {
    return this.data.get(key);
  }

  public set(key: string, value: any): void {
    const oldValue = this.data.get(key);
    if (oldValue !== value) {
      this.data.set(key, value);
      this.notify(key, value, oldValue);
    }
  }

  public subscribe(key: string, listener: StateListener): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key)!.push(listener);

    // Return an unsubscribe function
    return () => {
      const list = this.listeners.get(key) || [];
      const idx = list.indexOf(listener);
      if (idx !== -1) {
        list.splice(idx, 1);
      }
    };
  }

  private notify(key: string, newValue: any, oldValue: any): void {
    const list = this.listeners.get(key) || [];
    for (const listener of list) {
      try {
        listener(newValue, oldValue);
      } catch (err: any) {
        console.error(`[CoreState] Error in subscriber for key "${key}":`, err.message);
      }
    }
  }
}
