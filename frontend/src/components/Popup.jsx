import styles from '../styles/Popup.module.css'
import Form from './Form'

function Popup ({ method, onClose }) {
  const renderContent = () => {
    switch (method) {
      case 'login':
        return <Form route='/api/token/' method='login'/>;
      case 'register':
        return <Form route='/api/register/' method='register'/>;
      case 'create_schedule':
        return <div>Create Schedule</div>;
      case 'link_calendar':
        return <div>Link Calendar</div>;
      default:
        return <div>Unknown</div>;
    }
  };

  return (
    <div className={styles.backdrop}>
      <div className={styles.content}>
        {renderContent()}
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default Popup;