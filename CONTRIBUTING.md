# Contributing to PrisML

Thank you for your interest in contributing to PrisML! We welcome contributions from the community.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Install dependencies**: `pnpm install`
4. **Generate Prisma client**: `pnpm prisma generate`
5. **Run tests**: `pnpm test`
6. **Build**: `pnpm build`

## Development Workflow

### Running Tests

```bash
pnpm test                  # Run all tests
pnpm test:watch           # Watch mode
pnpm test:coverage        # With coverage report
```

### Code Quality

```bash
pnpm lint                 # Check linting
pnpm build                # TypeScript compilation
```

### Local Testing

```bash
# Test the package locally
pnpm pack                 # Creates tarball
cd ../test-project
npm install ../prisml/vncsleal-prisml-1.0.0.tgz
```

## Contribution Guidelines

### What We're Looking For

**High Priority:**
- Bug fixes (especially platform-specific issues)
- Documentation improvements
- Real-world examples
- Performance optimizations
- Test coverage improvements

**Medium Priority:**
- New algorithm support
- Developer experience enhancements
- Platform compatibility (Windows, Alpine, serverless)

**Not Accepting (Yet):**
- Deep learning models (V2.0+)
- Breaking API changes (wait for V2.0)
- Cloud integrations (planned for V3.0)

### Code Standards

1. **TypeScript**: All code must be strongly typed
2. **Tests**: Add tests for new features
3. **Documentation**: Update README/docs for user-facing changes
4. **Commits**: Use conventional commits format:
   - `feat: add streaming predictions`
   - `fix: handle null values in feature processor`
   - `docs: update platform compatibility matrix`
   - `test: add batch prediction edge cases`
   - `perf: optimize ONNX session creation`

### Pull Request Process

1. **Create an issue first** (for non-trivial changes)
2. **Branch naming**: `feature/your-feature` or `fix/bug-name`
3. **Keep PRs focused**: One feature/fix per PR
4. **Write tests**: Ensure all tests pass
5. **Update docs**: If user-facing changes
6. **Describe changes**: Clear PR description with context

### Testing Requirements

All PRs must:
- Pass existing tests (57 tests across 6 suites)
- Add new tests for new functionality
- Maintain or improve code coverage
- Pass TypeScript compilation
- Pass linting (warnings are acceptable if justified)

### Platform Testing

If your change affects platform compatibility:
- Test on macOS, Ubuntu, and Windows (if possible)
- Document any platform-specific behavior
- Update `docs/PLATFORM_COMPATIBILITY.md`

## Project Structure

```
prisml/
├── src/
│   ├── core/          # Type definitions, model API
│   ├── engine/        # ONNX inference, feature processing
│   ├── extension/     # Prisma Client extension
│   ├── cli/           # CLI commands (train, inspect)
│   └── __tests__/     # Test suites
├── scripts/           # Training scripts (Python)
├── examples/          # Example projects
├── docs/              # Documentation
└── prisma/            # Prisma schema for testing
```

## Development Tips

### Adding a New Algorithm

1. Update `scripts/train.py` to support the algorithm
2. Add algorithm to `TrainingConfig` type in `src/core/types.ts`
3. Add tests in `src/__tests__/`
4. Document in README.md

### Adding a New Feature

1. Define the API in `src/core/types.ts`
2. Implement in relevant module (`engine/`, `extension/`, etc.)
3. Add comprehensive tests
4. Update examples if applicable
5. Document in README and API docs

### Fixing Bugs

1. Write a failing test that reproduces the bug
2. Fix the bug
3. Verify the test now passes
4. Check for similar issues elsewhere

## Community

- **Discussions**: Ask questions, share ideas
- **Issues**: Bug reports, feature requests
- **Discord**: Coming soon (if community grows)

## Recognition

Contributors will be:
- Listed in CHANGELOG.md
- Credited in release notes
- Added to README contributors section (if significant contribution)

## Questions?

- Open a [GitHub Discussion](https://github.com/vncsleal/prisml/discussions)
- Create a [Question issue](https://github.com/vncsleal/prisml/issues/new/choose)
- Tag maintainers in your PR for review

## Code of Conduct

Be respectful, constructive, and professional. We're all here to build something useful.

---

Thank you for contributing to PrisML!
