const minimist = require(`minimist`);
const path = require(`path`);
const shell = require(`shelljs`);
const { mockShellFn } = require(path.join(process.cwd(), `mocks/shelljs.mocks`));
const pickBy = require(`lodash/pickBy`);
const keys = require(`lodash/keys`);
const sortBy = require(`lodash/sortBy`);
const map = require(`lodash/map`);

const TEST_SUITE = `npm-pack-all: ${__filename}`;
const TMP_DIR = path.join(process.cwd(), ".npm-pack-all-tmp");

beforeAll(() => {
    console.error = jest.fn();
});

beforeEach(() => {
    jest.resetModules();
});

afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    shell.rm(`-Rf`, `*.tgz`); // call this after post mock restore
});

afterAll(() => {
    console.info(`Success: ${TEST_SUITE}`);
});

describe(TEST_SUITE, () => {
    test("Can run proper shell commands, npm, no flags", () => {
        let mockArgs = ``;
        mockArgs = minimist(mockArgs.split(` `));

        //  mock input arguments
        jest.mock(`minimist`, () => {
            return jest.fn(() => mockArgs); // supply mock arguments to the script
        });

        jest.mock(`fs`, () => {
            return {
                existsSync: jest.fn(arg => {
                    return arg.includes(`package-lock.json`);
                }),
                writeFileSync: jest.fn()
            };
        });

        // mock shell commands
        jest.mock(`shelljs`, () => {
            return {
                code: 0, // success always
                config: { fatal: false, silent: false },
                exec: mockShellFn(`exec`),
                cp: mockShellFn(`cp`),
                mv: mockShellFn(`mv`),
                rm: mockShellFn(`rm`),
                mkdir: mockShellFn(`mkdir`),
                touch: mockShellFn(`touch`)
            };
        });

        // have access to the mock shell
        const mockShell = require(`shelljs`);

        // call script
        require(`../index`);

        const { orderedArgs } = sortModuleMockFnsByCallOrder(mockShell);

        // these commands should be run in the following order by default
        expect(orderedArgs).toEqual([
            `rm("-Rf","${TMP_DIR}")`,
            `mkdir("-p","${TMP_DIR}")`,
            `cp("-Rf","${path.join(process.cwd(), "package.json")}","${TMP_DIR}/package.json")`,
            `cp("-Rf","${path.join(process.cwd(), "package-lock.json")}","${TMP_DIR}/package-lock.json")`,
            `cp("-Rf","${path.join(process.cwd(), "yarn.lock")}","${TMP_DIR}/yarn.lock")`,
            `cp("-Rf","${path.join(process.cwd(), ".npmignore")}","${TMP_DIR}/.npmignore")`,
            `touch(".npmignore")`,
            `exec("npm -dd pack",{"silent":false,"maxBuffer":10485760,"timeout":180000})`,
            `mv("-f","${TMP_DIR}/package.json","${path.join(process.cwd(), "package.json")}")`,
            `mv("-f","${TMP_DIR}/package-lock.json","${path.join(process.cwd(), "package-lock.json")}")`,
            `mv("-f","${TMP_DIR}/yarn.lock","${path.join(process.cwd(), "yarn.lock")}")`,
            `mv("-f","${TMP_DIR}/.npmignore","${path.join(process.cwd(), ".npmignore")}")`,
            `rm("-Rf","${TMP_DIR}")`
        ]);
    });

    test("Does inject bundledDependencies, npm, --dev-deps", () => {
        let mockArgs = `--dev-deps`;
        mockArgs = minimist(mockArgs.split(` `));

        //  mock input arguments
        jest.mock(`minimist`, () => {
            return jest.fn(() => mockArgs); // supply mock arguments to the script
        });

        jest.mock(`fs`, () => {
            return {
                existsSync: jest.fn(arg => {
                    return arg.includes(`package-lock.json`);
                }),
                writeFileSync: jest.fn((file, data) => {
                    const packageJsonLoc = require(`path`).join(process.cwd(), `package.json`);
                    const packageJson = require(packageJsonLoc);
                    const deps = Object.keys(packageJson.dependencies);
                    const devDeps = Object.keys(packageJson.devDependencies);
                    expect(file).toEqual(packageJsonLoc);
                    expect(JSON.parse(data).bundledDependencies).toEqual(deps.concat(devDeps));
                })
            };
        });

        // mock shell commands
        jest.mock(`shelljs`, () => {
            return {
                code: 0, // success always
                config: { fatal: false, silent: false },
                exec: mockShellFn(`exec`),
                cp: mockShellFn(`cp`),
                mv: mockShellFn(`mv`),
                rm: mockShellFn(`rm`),
                mkdir: mockShellFn(`mkdir`),
                touch: mockShellFn(`touch`)
            };
        });

        // call script
        require(`../index`);
    });

    test("Does output to --output flag location", () => {
        const outputLoc = `deploy/artifact.tgz`;
        let mockArgs = `--output ${outputLoc}`;
        mockArgs = minimist(mockArgs.split(` `));

        //  mock input arguments
        jest.mock(`minimist`, () => {
            return jest.fn(() => mockArgs); // supply mock arguments to the script
        });

        jest.mock(`fs`, () => {
            return {
                existsSync: jest.fn(() => false), // assume output dir doesn't exist
                writeFileSync: jest.fn((file, data) => {
                    const packageJsonLoc = require(`path`).join(process.cwd(), `package.json`);
                    const packageJson = require(packageJsonLoc);
                    const deps = Object.keys(packageJson.dependencies);
                    expect(file).toEqual(packageJsonLoc);
                    expect(JSON.parse(data).bundledDependencies).toEqual(deps);
                })
            };
        });

        // mock shell commands
        jest.mock(`shelljs`, () => {
            return {
                code: 0, // success always
                config: { fatal: false, silent: false },
                exec: mockShellFn(`exec`),
                cp: mockShellFn(`cp`),
                mv: mockShellFn(`mv`),
                rm: mockShellFn(`rm`),
                mkdir: mockShellFn(`mkdir`),
                touch: mockShellFn(`touch`)
            };
        });

        // have access to the mock shell
        const mockShell = require(`shelljs`);

        // call script
        require(`../index`);

        const { orderedArgs } = sortModuleMockFnsByCallOrder(mockShell);
        const packageJsonLoc = require(`path`).join(process.cwd(), `package.json`);
        const packageJson = require(packageJsonLoc);

        // these commands should be run in the following order by default
        expect(orderedArgs).toEqual([
            `rm("-Rf","${TMP_DIR}")`,
            `mkdir("-p","${TMP_DIR}")`,
            `cp("-Rf","${path.join(process.cwd(), "package.json")}","${TMP_DIR}/package.json")`,
            `cp("-Rf","${path.join(process.cwd(), "package-lock.json")}","${TMP_DIR}/package-lock.json")`,
            `cp("-Rf","${path.join(process.cwd(), "yarn.lock")}","${TMP_DIR}/yarn.lock")`,
            `cp("-Rf","${path.join(process.cwd(), ".npmignore")}","${TMP_DIR}/.npmignore")`,
            `touch(".npmignore")`,
            `exec("npm -dd pack",{"silent":false,"maxBuffer":10485760,"timeout":180000})`,
            `mv("-f","${TMP_DIR}/package.json","${path.join(process.cwd(), "package.json")}")`,
            `mv("-f","${TMP_DIR}/package-lock.json","${path.join(process.cwd(), "package-lock.json")}")`,
            `mv("-f","${TMP_DIR}/yarn.lock","${path.join(process.cwd(), "yarn.lock")}")`,
            `mv("-f","${TMP_DIR}/.npmignore","${path.join(process.cwd(), ".npmignore")}")`,
            `rm("-Rf","${TMP_DIR}")`,
            `mkdir("-p","${path.join(process.cwd(), "deploy")}")`,
            `mv("-f","${path.join(process.cwd(), `${packageJson.name}-${packageJson.version}.tgz`)}","${path.join(
                process.cwd(),
                outputLoc
            )}")`
        ]);
    });

    test("Return .npmignore to proper state", () => {
        const fs = jest.requireActual(`fs`);
        const npmIgnoreContent = fs.existsSync(`.npmignore`) && fs.readFileSync(`.npmignore`);

        // mock shell commands
        jest.mock(`shelljs`, () => {
            return {
                code: 0, // success always
                config: { fatal: false, silent: false },
                exec: mockShellFn(`exec`),
                cp: mockShellFn(`cp`),
                mv: mockShellFn(`mv`),
                rm: mockShellFn(`rm`),
                mkdir: mockShellFn(`mkdir`),
                touch: mockShellFn(`touch`)
            };
        });

        // call script
        require(`../index`);

        // if npmIgnoreExists, make sure it was replaced correctly
        !!npmIgnoreContent && expect(fs.existsSync(`.npmignore`)).toBeTruthy();
    });
});

function sortModuleMockFnsByCallOrder(mocks) {
    const mockFnsInOrder = [];

    const mockFns = pickBy(mocks, mock => {
        return mock._isMockFunction;
    });

    // iterate each mocked fn in module
    keys(mockFns).forEach(fnName => {
        // combine calls, instances, results, etc
        for (let i = 0; i < mockFns[fnName].mock.calls.length; i++) {
            mockFnsInOrder.push({
                fnName,
                calls: mockFns[fnName].mock.calls[i],
                instances: mockFns[fnName].mock.instances[i],
                invocationCallOrder: mockFns[fnName].mock.invocationCallOrder[i],
                results: mockFns[fnName].mock.results[i]
            });
        }
    });

    const orderedFns = sortBy(mockFnsInOrder, ["invocationCallOrder"]);
    const orderedArgs = map(orderedFns, fn => {
        return `${fn.fnName}(${JSON.stringify(fn.calls).replace(/[\[\]']+/g, "")})`;
    });

    return { orderedFns, orderedArgs };
}
