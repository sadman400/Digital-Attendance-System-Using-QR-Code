module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).json({ status: 'ok', message: 'API is running', version: '2.0' });
};
