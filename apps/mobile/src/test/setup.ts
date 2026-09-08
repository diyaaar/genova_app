import { resetTenantCacheRegistry } from '../auth/tenant-cache';

jest.mock('@dariyd/react-native-pdf-page-image', () => ({
  PdfPageImage: {
    open: jest.fn(),
    generate: jest.fn(),
    close: jest.fn(),
  },
}));

jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Component = ({ children, ...props }: { children?: React.ReactNode }) =>
    React.createElement(View, props, children);
  const makeBuilder = () => {
    const path = {};
    const builder: Record<string, (...args: unknown[]) => unknown> = {};
    for (const name of ['moveTo', 'lineTo', 'quadTo', 'cubicTo', 'close', 'addRRect']) {
      builder[name] = () => builder;
    }
    builder.build = () => path;
    builder.detach = () => path;
    return builder;
  };
  return {
    Canvas: Component,
    Group: Component,
    Path: Component,
    Skia: { PathBuilder: { Make: makeBuilder } },
  };
});

beforeEach(() => {
  resetTenantCacheRegistry();
});
