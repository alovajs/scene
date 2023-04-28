// 防止Vue warn打印
const warn = console.warn;
console.warn = (...args) => {
  args = args.filter(a => !/vue warn/i.test(a));
  if (args.length > 0) {
    warn.apply(console, args);
  }
};
