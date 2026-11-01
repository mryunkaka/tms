import { describe, expect, it } from '@jest/globals';
import { renderToStaticMarkup } from 'react-dom/server';
import HomePage from './page';

describe('home page', () => {
  it('renders a welcoming message for multi-region trips', () => {
    expect(renderToStaticMarkup(HomePage())).toContain('Perjalanan wisata, berangkat dari mana saja.');
  });
});
