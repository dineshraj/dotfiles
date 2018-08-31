import { Component } from 'react';
import { Modal, FullPageOverlay, Icon, Link, Button } from '@bbc/iplayer-web-components';

export default class TvlModal extends Component {

  constructor(props) {
    super(props);
    this.confirmClickHandler = this.confirmClickHandler.bind(this);
    this.addLinkTracking = this.addLinkTracking.bind(this);
  }

  addLinkTracking(ref) {
    if (ref) {
      this.props.addTrackingToFindOutMoreLink(ref.querySelector('.lnk--tvl-findoutmore'));
      this.props.addTrackingToNoLicenceLink(ref.querySelector('.button--notvl'));
    }
  }

  renderFindOutMoreLink() {
    const { findOutMoreText, findOutMoreLink } = this.props;
    const icon = <Icon icon="external-link" />;
    return (
      <p className="modal-dialog__content-links">
        <Link
          href={findOutMoreLink}
          icon={icon}
          classes={['lnk--tvl-findoutmore', 'typo typo--bold']}
        >
          {findOutMoreText}
        </Link>
      </p>
    );
  }

  confirmClickHandler() {
    const { type, confirmAction } = this.props;
    confirmAction(type);
  }

  renderFooterComponents() {
    const { ctaYesText, ctaNoText, ctaNoLink } = this.props;
    const tvlYesButton = <Button key={1} action="confirm" classes="button--full-width" fontSize="skylark" clickHandler={this.confirmClickHandler}>{ctaYesText}</Button>;
    const tvlNoButton = <Button key={2} href={ctaNoLink} classes="button--full-width button--notvl" fontSize="skylark">{ctaNoText}</Button>;

    return [
      tvlYesButton,
      tvlNoButton
    ];
  }

  render() {
    const { visible, title, subtitle } = this.props;
    if (!visible) {
      return null;
    }
    return (
      <FullPageOverlay>
        <div ref={this.addLinkTracking}>
          <Modal
            title={title}
            text={[subtitle]}
            type="tvl"
            footerComponents={this.renderFooterComponents()}
          >
            {this.renderFindOutMoreLink()}
          </Modal>
        </div>
      </FullPageOverlay>
    );
  }
}
