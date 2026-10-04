import logo from '../../logo.png';
import './Header.css';

export default function Header() {
  return (
    <header className="topbar">
      <a className="brand" href="#main" aria-label="מחשבון שכר">
        <span className="brand-mark">
          <img src={logo} alt="" />
        </span>
      </a>
      <h1 className="header-title">מחשבון שכר</h1>
    </header>
  );
}
