// Wrap async handlers so rejections reach the error middleware.
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const publicUser = (u) => u && ({
  id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role,
  addresses: u.addresses || [],
});
