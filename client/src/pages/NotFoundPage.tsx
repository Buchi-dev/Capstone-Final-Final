/**
 * 404 Not Found Page Component
 */

import { theme, Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

export const NotFoundPage = () => {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      backgroundColor: token.colorBgLayout,
      color: token.colorText
    }}>
      <Result
        status="404"
        title="404 - Page Not Found"
        subTitle="Sorry, the page you're looking for doesn't exist."
        extra={
          <Button 
            type="primary" 
            onClick={() => navigate('/')}
          >
            Go to Home
          </Button>
        }
      />
    </div>
  );
};
