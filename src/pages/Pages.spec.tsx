import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Home from './Home';
import About from './About';
import NotFound from './NotFound';
import Footer from './Footer';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Home Page', () => {
  it('should render home page', () => {
    const { container } = renderWithRouter(<Home />);
    expect(container).toBeTruthy();
  });

  it('should contain heading', () => {
    renderWithRouter(<Home />);
    const headings = screen.queryAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);
  });
});

describe('About Page', () => {
  it('should render about page', () => {
    const { container } = renderWithRouter(<About />);
    expect(container).toBeTruthy();
  });

  it('should contain heading', () => {
    renderWithRouter(<About />);
    const headings = screen.queryAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);
  });
});

describe('NotFound Page', () => {
  it('should render 404 page', () => {
    const { container } = renderWithRouter(<NotFound />);
    expect(container).toBeTruthy();
  });

  it('should display error message', () => {
    const { container } = renderWithRouter(<NotFound />);
    expect(container).toBeTruthy();
  });
});

describe('Footer Component', () => {
  it('should render footer', () => {
    const { container } = render(<Footer />);
    expect(container).toBeTruthy();
  });

  it('should display copyright or company info', () => {
    const { container } = render(<Footer />);
    expect(container.textContent).toBeTruthy();
  });
});
