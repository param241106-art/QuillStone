import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from '@/AppRoutes';
import { BASENAME } from '@/lib/assets';

function App() {
  return (
    <BrowserRouter basename={BASENAME}>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
