let toastId = 0;
let listeners = [];

export const toast = {
  show({ message, type = 'info', duration = 4000, onUndo }) {
    const id = ++toastId;
    listeners.forEach((listener) => listener({ id, message, type, duration, onUndo }));
    return id;
  },
};

export const addToastListener = (listener) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((existing) => existing !== listener);
  };
};
