export const healthController = {
  getHealth: (req, res) => {
    res.json({ data: { status: 'ok' } });
  },
};
