import { Layout, Typography, Space, Row, Col } from 'antd';

const { Footer: AntFooter } = Layout;
const { Link, Text } = Typography;

const Footer = () => {
  return (
    <AntFooter style={{ 
      backgroundColor: '#041E42', 
      padding: '24px 0', 
      boxShadow: '0 50vh 0 50vh #041e42',
      width: '100vw',
      left: 0,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div className="container" style={{
        width: '100%',
        padding: '0 48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: '100%', marginBottom: 16 }}>
          <img src="/utep_logo_white.png" alt="UTEP" style={{ height: '40px', marginRight: 24 }} />
          <Text strong style={{ color: '#fff', fontSize: '18px', display: 'block' }}>
            THE UNIVERSITY OF TEXAS AT EL PASO
          </Text>
        </div>
        <Row gutter={[48, 24]} justify="start" style={{ width: '100%' }}>
          <Col xs={24} sm={8} md={4}>
            <Space direction="vertical" size="small">
              <Link href="https://www.utep.edu/emergency/" target="_blank" rel="noopener" style={{ color: '#fff' }}>
                Emergency Information
              </Link>
              <Link href="https://www.utep.edu/required-links/" target="_blank" rel="noopener" style={{ color: '#fff' }}>
                Required Links
              </Link>
            </Space>
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Space direction="vertical" size="small">
              <Link href="https://www.utep.edu/eoaa/policies/accessibility-policy.html" target="_blank" rel="noopener" style={{ color: '#fff' }}>
                Web Accessibility
              </Link>
              <Link href="https://www.utep.edu/vpba/state-reports/" target="_blank" rel="noopener" style={{ color: '#fff' }}>
                State Reports
              </Link>
            </Space>
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Space direction="vertical" size="small">
              <Link href="http://www.utsystem.edu/" target="_blank" rel="noopener" style={{ color: '#fff' }}>
                UT System
              </Link>
              <Link href="http://sao.fraud.state.tx.us/" target="_blank" rel="noopener" style={{ color: '#fff' }}>
                Report Fraud
              </Link>
            </Space>
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Space direction="vertical" size="small">
              <Link href="https://www.utep.edu/student-affairs/resources/Mental-Health-Resources-for-UTEP-Students.html" target="_blank" rel="noopener" style={{ color: '#fff' }}>
                Mental Health Resources
              </Link>
              <Link href="https://www.utep.edu/titleix/" target="_blank" rel="noopener" style={{ color: '#fff' }}>
                TITLE IX
              </Link>
            </Space>
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Space direction="vertical" size="small">
              <Link href="https://www.utep.edu/resources/public-course-information.html" target="_blank" rel="noopener" style={{ color: '#fff' }}>
                Public Course Information
              </Link>
              <Link href="https://www.utep.edu/clery/" target="_blank" rel="noopener" style={{ color: '#fff' }}>
                Clery Crime Statistics
              </Link>
            </Space>
          </Col>
        </Row>
        <div style={{ 
          marginTop: '24px', 
          paddingTop: '24px', 
          borderTop: '1px solid rgba(255,255,255,0.1)',
          color: '#fff',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          justifyContent: 'flex-start',
          width: '100%'
        }}>
          <Text style={{ color: '#fff' }}>500 West University Avenue</Text>
          <Text style={{ color: '#fff' }}>|</Text>
          <Text style={{ color: '#fff' }}>El Paso, TX 79968</Text>
          <Text style={{ color: '#fff' }}>|</Text>
          <Text style={{ color: '#fff' }}>915-747-5000</Text>
          <Text style={{ color: '#fff' }}>|</Text>
          <Link href="https://www.utep.edu/feedback" target="_blank" rel="noopener" style={{ color: '#fff' }}>
            SITE FEEDBACK
          </Link>
        </div>
      </div>
    </AntFooter>
  );
};

export default Footer; 