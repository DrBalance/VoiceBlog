require('dotenv').config();
const express = require('express');
const cors = require('cors');

const transcribeRouter = require('./routes/transcribe');
const generateRouter = require('./routes/generate');
const imagesRouter = require('./routes/images');
const generationsRouter = require('./routes/generations');
const profilesRouter = require('./routes/profiles');
const imageGenRouter = require('./routes/imageGen');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: function(origin, callback) {
    const allowed = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:3000',
    ].filter(Boolean);
    
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

// 헬스체크
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 라우터
app.use('/api/transcribe', transcribeRouter);
app.use('/api/generate', generateRouter);
app.use('/api/generate', imagesRouter);
app.use('/api/generations', generationsRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/imagegen', imageGenRouter);

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || '서버 오류가 발생했습니다.',
  });
});

app.listen(PORT, () => {
  console.log(`Voice Blog 서버 실행 중: http://localhost:${PORT}`);
});
