import 'dotenv/config';
import express from 'express';
import authRoutes from './routes/auth.js';
import buildRoutes from './routes/builds.js';
import cors from 'cors';
import componentRoutes from './routes/components.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'SistemGaraj API çalışıyor 🚀' });
});

app.use('/api/auth', authRoutes);
app.use('/api/builds', buildRoutes);
app.use('/api/components', componentRoutes);

app.listen(PORT, () => {
  console.log(`✅ Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});
