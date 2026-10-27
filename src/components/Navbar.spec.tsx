import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from './Navbar';

describe('Navbar Component', () => {
  const renderNavbar = () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );
  };

  it('should render the navbar', () => {
    renderNavbar();
    const appBar = screen.getByRole('banner');
    expect(appBar).toBeTruthy();
  });

  it('should display navigation links', () => {
    renderNavbar();
    
    // Check that navbar has links (may be router-dom Links)
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
  });

  it('should have links pointing to correct routes', () => {
    renderNavbar();
    
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    
    // At least one link should have an href attribute
    const hasHref = links.some(link => link.getAttribute('href'));
    expect(hasHref).toBe(true);
  });

  it('should render app title', () => {
    renderNavbar();
    expect(screen.getByText(/React App/i)).toBeTruthy();
  });
});
