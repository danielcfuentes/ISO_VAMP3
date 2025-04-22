import PropTypes from 'prop-types';
import { Layout, Menu, Button, Typography, Space } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  DesktopOutlined, 
  FileTextOutlined, 
  DashboardOutlined, 
  LogoutOutlined,
  FacebookOutlined,
  TwitterOutlined,
  YoutubeOutlined,
  InstagramOutlined,
  MailOutlined,
  PhoneOutlined
} from '@ant-design/icons';
import Footer from './Footer';

const { Content, Sider } = Layout;
const { Link } = Typography;

const MainLayout = ({ children, isAdmin, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/my-agents',
      icon: <DesktopOutlined />,
      label: 'My Scans',
    },
    {
      key: '/exception-requests',
      icon: <FileTextOutlined />,
      label: 'Exception Requests',
    },
    ...(isAdmin ? [
      {
        key: '/admin-dashboard',
        icon: <DashboardOutlined />,
        label: 'Server Administration',
      }
    ] : []),
    {
      key: 'https://www.utep.edu/information-resources/iso/',
      icon: <FileTextOutlined />,
      label: 'ISO Home Page',
      onClick: () => window.open('https://www.utep.edu/information-resources/iso/', '_blank')
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div className="utep-header">
        <div className="header-container">
          <div className="utep-branding">
            <a href="https://www.utep.edu">
              <img src="/utep_logo.png" alt="UTEP" className="utep-logo" />
            </a>
          </div>
          <div className="department-heading">
            <h1>Vulnerability Management Program (VaMP)</h1>
            <h2>Information Security Office</h2>
          </div>
          <div className="utep-nav-right">
            <a href="https://www.utep.edu">UTEP.EDU</a>
          </div>
        </div>
      </div>

      <Layout>
        {/* Sidebar */}
        <Sider
          theme="light"
          className="utep-sidebar"
          width={280}
        >
          <h2 className="sidebar-heading">Quick Links</h2>
          <Menu
            theme="light"
            selectedKeys={[location.pathname]}
            mode="vertical"
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            className="utep-menu"
          />
          
          <div className="connect-section">
            <h2 className="sidebar-heading">Connect With Us</h2>
            <div className="divider-accent"></div>
            <div className="contact-info">
              <p>The University of Texas at El Paso<br/>
                Information Security Office<br/>
                500 W University<br/>
                El Paso, Texas 79902</p>
              <p>
                <Space align="center" className="contact-item">
                  <MailOutlined />
                  <Link href="mailto:security@utep.edu" className="contact-link">security@utep.edu</Link>
                </Space>
                <br/>
                <Space align="center" className="contact-item">
                  <PhoneOutlined />
                  <span>(915) 747-6324</span>
                </Space>
              </p>
            </div>
            
            <Space size="middle" className="social-icons">
              <Link href="https://www.facebook.com/UTEPMiners/" target="_blank" rel="noopener">
                <FacebookOutlined />
              </Link>
              <Link href="https://twitter.com/utep" target="_blank" rel="noopener">
                <TwitterOutlined />
              </Link>
              <Link href="https://www.youtube.com/user/UTEP" target="_blank" rel="noopener">
                <YoutubeOutlined />
              </Link>
              <Link href="https://www.instagram.com/utep_miners/" target="_blank" rel="noopener">
                <InstagramOutlined />
              </Link>
            </Space>
          </div>

          <div className="logout-section">
            <Button type="link" block onClick={onLogout} className="logout-button">
              <LogoutOutlined /> Sign Out
            </Button>
          </div>
        </Sider>

        <Layout>
          <Content className="main-content">
            {children}
          </Content>
          <Footer />
        </Layout>
      </Layout>
    </Layout>
  );
};

MainLayout.propTypes = {
  children: PropTypes.node.isRequired,
  isAdmin: PropTypes.bool.isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default MainLayout;