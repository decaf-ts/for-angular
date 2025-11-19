import './setup';
import { Meta, StoryObj } from '@storybook/angular';
let Github = '/github.svg';
let Discord = '/discord.svg';
let Youtube = '/youtube.svg';
let Tutorials = '/tutorials.svg';
let Styling = '/styling.png';
let Context = '/context.png';
let Assets = '/assets.png';
let Docs = '/docs.png';
let Share = '/share.png';
let FigmaPlugin = '/figma-plugin.png';
let Testing = '/testing.png';
let Accessibility = '/accessibility.png';
let Theming = '/theming.png';
let AddonLibrary = '/addon-library.png';

export const content = {
  title: 'Decaf For Angular',
  sections: [
    {
      title: 'Configure your project',
      description:
        "Because Storybook works separately from your app, you'll need to configure it for your specific stack and setup. Below, explore guides for configuring Storybook with popular frameworks and tools. If you get stuck, learn how you can ask for help from our community.",
      items: [
        {
          image: Styling,
          heading: 'Add styling and CSS',
          paragraph:
            'Like with web applications, there are many ways to include CSS within Storybook. Learn more about setting up styling within Storybook.',
          link: 'https://storybook.js.org/docs/configure/styling-and-css/?renderer=angular&ref=configure',
        },
        {
          image: Context,
          heading: 'Provide context and mocking',
          paragraph:
            "Often when a story doesn't render, it's because your component is expecting a specific environment or context (like a theme provider) to be available.",
          link: 'https://storybook.js.org/docs/writing-stories/decorators/?renderer=angular&ref=configure#context-for-mocking',
        },
        {
          image: Assets,
          heading: 'Load assets and resources',
          paragraph:
            'To link static files (like fonts) to your projects and stories, use the `staticDirs` configuration option to specify folders to load when starting Storybook.',
          link: 'https://storybook.js.org/docs/configure/images-and-assets/?renderer=angular&ref=configure',
        },
      ],
    },
    {
      title: 'Do more with Storybook',
      description:
        "Now that you know the basics, let's explore other parts of Storybook that will improve your experience. This list is just to get you started. You can customise Storybook in many ways to fit your needs.",
      gridItems: [
        {
          image: Docs,
          heading: 'Autodocs',
          paragraph:
            'Auto-generate living, interactive reference documentation from your components and stories.',
          link: 'https://storybook.js.org/docs/writing-docs/autodocs/?renderer=angular&ref=configure',
        },
        {
          image: Share,
          heading: 'Publish to Chromatic',
          paragraph:
            'Publish your Storybook to review and collaborate with your entire team.',
          link: 'https://storybook.js.org/docs/sharing/publish-storybook/?renderer=angular&ref=configure#publish-storybook-with-chromatic',
        },
        {
          image: FigmaPlugin,
          heading: 'Figma Plugin',
          paragraph:
            'Embed your stories into Figma to cross-reference the design and live implementation in one place.',
          link: 'https://storybook.js.org/docs/sharing/design-integrations/?renderer=angular&ref=configure#embed-storybook-in-figma-with-the-plugin',
        },
        {
          image: Testing,
          heading: 'Testing',
          paragraph:
            'Use stories to test a component in all its variations, no matter how complex.',
          link: 'https://storybook.js.org/docs/writing-tests/?renderer=angular&ref=configure',
        },
        {
          image: Accessibility,
          heading: 'Accessibility',
          paragraph:
            'Automatically test your components for a11y issues as you develop.',
          link: 'https://storybook.js.org/docs/writing-tests/accessibility-testing/?renderer=angular&ref=configure',
        },
        {
          image: Theming,
          heading: 'Theming',
          paragraph: "Theme Storybook's UI to personalize it to your project.",
          link: 'https://storybook.js.org/docs/configure/theming/?renderer=angular&ref=configure',
        },
      ],
    },
  ],
  addons: {
    heading: 'Addons',
    paragraph: 'Integrate your tools with Storybook to connect workflows.',
    link: 'https://storybook.js.org/addons/?ref=configure',
    image: AddonLibrary,
  },
  socials: [
    {
      image: Github,
      alt: 'Github logo',
      description:
        'Join our contributors building the future of UI development.',
      link: 'https://github.com/storybookjs/storybook',
    },
    {
      image: Discord,
      alt: 'Discord logo',
      description: 'Get support and chat with frontend developers.',
      link: 'https://discord.gg/storybook',
    },
    {
      image: Youtube,
      alt: 'Youtube logo',
      description: 'Watch tutorials, feature previews and interviews.',
      link: 'https://www.youtube.com/@chromaticui',
    },
    {
      image: Tutorials,
      alt: 'A book',
      description: 'Follow guided walkthroughs on for key workflows.',
      link: 'https://storybook.js.org/tutorials/?ref=configure',
    },
  ],
};

const meta: Meta = {
  title: 'Configure',
  parameters: {
    docs: {
      description: {
        component: content.title,
      },
    },
  },
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => ({
    props: {
      content: content,
    },
    template: `
      <div class="sb-page">
        <h1>{{ content.title }}</h1>
        <div class="sb-container" *ngFor="let section of content.sections">
          <div class="sb-section-title">
            <h2>{{ section.title }}</h2>
            <p>{{ section.description }}</p>
          </div>
          <div class="sb-section">
            <div class="sb-section-item" *ngFor="let item of section.items">
              <img [src]="item.image" [alt]="item.heading" />
              <h3 class="sb-section-item-heading">{{ item.heading }}</h3>
              <p class="sb-section-item-paragraph">{{ item.paragraph }}</p>
              <a [href]="item.link">Learn more</a>
            </div>
            <div class="sb-section-item" *ngFor="let gridItem of section.gridItems">
              <img [src]="gridItem.image" [alt]="gridItem.heading" />
              <h3 class="sb-section-item-heading">{{ gridItem.heading }}</h3>
              <p>{{ gridItem.paragraph }}</p>
              <a [href]="gridItem.link">Learn more</a>
            </div>
          </div>
        </div>
        <div class="sb-addon">
          <div class="sb-addon-text">
            <h4>{{ content.addons.heading }}</h4>
            <p class="sb-section-item-paragraph">{{ content.addons.paragraph }}</p>
            <a [href]="content.addons.link">Explore Addons</a>
            <img class="sb-addon-img" [src]="content.addons.image" alt="Addons" />
          </div>
        </div>

        <div class="sb-section sb-socials">
          <div class="sb-section-item" *ngFor="let social of content.socials">
            <img class="sb-explore-image" [src]="social.image" [alt]="social.alt" />
            <div>{{ social.description }}  <a [href]="social.link">Visit</a></div>
          </div>
        </div>
      </div>

      <style>
        .sb-page {
          height: auto;
          min-height: 100%;
          overflow-y: auto;
        }

        .sb-container {
          margin-bottom: 48px;
        }

        .sb-section {
          width: 100%;
          display: flex;
          flex-direction: row;
          gap: 20px;
        }

        img {
          object-fit: cover;
        }

        .sb-section-title {
          margin-bottom: 32px;
        }

        .sb-section a:not(h1 a, h2 a, h3 a) {
          font-size: 14px;
        }

        .sb-section-item, .sb-grid-item {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .sb-section-item-heading {
          padding-top: 20px !important;
          padding-bottom: 5px !important;
          margin: 0 !important;
        }
        .sb-section-item-paragraph {
          margin: 0;
          padding-bottom: 10px;
        }

        .sb-chevron {
          margin-left: 5px;
        }

        .sb-features-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          grid-gap: 32px 20px;
        }

        .sb-socials {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
        }

        .sb-socials p {
          margin-bottom: 10px;
        }

        .sb-explore-image {
          max-height: 32px;
          align-self: flex-start;
        }

        .sb-addon {
          width: 100%;
          display: flex;
          align-items: center;
          position: relative;
          background-color: #EEF3F8;
          border-radius: 5px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          background: #EEF3F8;
          height: 180px;
          margin-bottom: 48px;
          overflow: hidden;
        }

        .sb-addon-text {
          padding-left: 48px;
          max-width: 240px;
        }

        .sb-addon-text h4 {
          padding-top: 0px;
        }

        .sb-addon-img {
          position: absolute;
          left: 345px;
          top: 0;
          height: 100%;
          width: 200%;
          overflow: hidden;
        }

        .sb-addon-img img {
          width: 650px;
          transform: rotate(-15deg);
          margin-left: 40px;
          margin-top: -72px;
          box-shadow: 0 0 1px rgba(255, 255, 255, 0);
          backface-visibility: hidden;
        }

        @media screen and (max-width: 800px) {
          .sb-addon-img {
            left: 300px;
          }
        }

        @media screen and (max-width: 600px) {
          .sb-section {
            flex-direction: column;
          }

          .sb-features-grid {
            grid-template-columns: repeat(1, 1fr);
          }

          .sb-socials {
            grid-template-columns: repeat(2, 1fr);
          }

          .sb-addon {
            height: 280px;
            align-items: flex-start;
            padding-top: 32px;
            overflow: hidden;
          }

          .sb-addon-text {
            padding-left: 24px;
          }

          .sb-addon-img {
            right: 0;
            left: 0;
            top: 130px;
            bottom: 0;
            overflow: hidden;
            height: auto;
            width: 124%;
          }

          .sb-addon-img img {
            width: 1200px;
            transform: rotate(-12deg);
            margin-left: 0;
            margin-top: 48px;
            margin-bottom: -40px;
            margin-left: -24px;
          }
        }
      </style>

    `,
  }),
};
