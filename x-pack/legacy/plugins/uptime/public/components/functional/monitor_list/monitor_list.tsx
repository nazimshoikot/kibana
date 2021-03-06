/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonIcon,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useState } from 'react';
import styled from 'styled-components';
import { withUptimeGraphQL, UptimeGraphQLQueryProps } from '../../higher_order';
import { monitorStatesQuery } from '../../../queries/monitor_states_query';
import {
  MonitorSummary,
  MonitorSummaryResult,
  SummaryHistogramPoint,
} from '../../../../common/graphql/types';
import { MonitorListStatusColumn } from './monitor_list_status_column';
import { formatUptimeGraphQLErrorList } from '../../../lib/helper/format_error_list';
import { ExpandedRowMap } from './types';
import { MonitorBarSeries } from '../charts';
import { MonitorPageLink } from './monitor_page_link';
import { OverviewPageLink } from './overview_page_link';
import * as labels from './translations';
import { MonitorListDrawer } from '../../connected';
import { MonitorListPageSizeSelect } from './monitor_list_page_size_select';

interface MonitorListQueryResult {
  monitorStates?: MonitorSummaryResult;
}

interface MonitorListProps {
  dangerColor: string;
  hasActiveFilters: boolean;
  successColor: string;
  linkParameters?: string;
  pageSize: number;
  setPageSize: (size: number) => void;
}

type Props = UptimeGraphQLQueryProps<MonitorListQueryResult> & MonitorListProps;

const TruncatedEuiLink = styled(EuiLink)`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const MonitorListComponent = (props: Props) => {
  const { dangerColor, data, errors, hasActiveFilters, linkParameters, loading } = props;
  const [drawerIds, updateDrawerIds] = useState<string[]>([]);

  const items = data?.monitorStates?.summaries ?? [];

  const nextPagePagination = data?.monitorStates?.nextPagePagination ?? '';
  const prevPagePagination = data?.monitorStates?.prevPagePagination ?? '';

  const getExpandedRowMap = () => {
    return drawerIds.reduce((map: ExpandedRowMap, id: string) => {
      return {
        ...map,
        [id]: (
          <MonitorListDrawer
            summary={items.find(({ monitor_id: monitorId }) => monitorId === id)}
          />
        ),
      };
    }, {});
  };

  const columns = [
    {
      align: 'left' as const,
      field: 'state.monitor.status',
      name: labels.STATUS_COLUMN_LABEL,
      mobileOptions: {
        fullWidth: true,
      },
      render: (status: string, { state: { timestamp, checks } }: MonitorSummary) => {
        return (
          <MonitorListStatusColumn status={status} timestamp={timestamp} checks={checks ?? []} />
        );
      },
    },
    {
      align: 'left' as const,
      field: 'state.monitor.name',
      name: labels.NAME_COLUMN_LABEL,
      mobileOptions: {
        fullWidth: true,
      },
      render: (name: string, summary: MonitorSummary) => (
        <MonitorPageLink monitorId={summary.monitor_id} linkParameters={linkParameters}>
          {name ? name : `Unnamed - ${summary.monitor_id}`}
        </MonitorPageLink>
      ),
      sortable: true,
    },
    {
      align: 'left' as const,
      field: 'state.url.full',
      name: labels.URL,
      render: (url: string, summary: MonitorSummary) => (
        <TruncatedEuiLink href={url} target="_blank" color="text">
          {url} <EuiIcon size="s" type="popout" color="subbdued" />
        </TruncatedEuiLink>
      ),
    },
    {
      align: 'center' as const,
      field: 'histogram.points',
      name: labels.HISTORY_COLUMN_LABEL,
      mobileOptions: {
        show: false,
      },
      render: (histogramSeries: SummaryHistogramPoint[] | null) => (
        <MonitorBarSeries dangerColor={dangerColor} histogramSeries={histogramSeries} />
      ),
    },
    {
      align: 'right' as const,
      field: 'monitor_id',
      name: '',
      sortable: true,
      isExpander: true,
      width: '24px',
      render: (id: string) => {
        return (
          <EuiButtonIcon
            aria-label={labels.getExpandDrawerLabel(id)}
            iconType={drawerIds.includes(id) ? 'arrowUp' : 'arrowDown'}
            onClick={() => {
              if (drawerIds.includes(id)) {
                updateDrawerIds(drawerIds.filter(p => p !== id));
              } else {
                updateDrawerIds([...drawerIds, id]);
              }
            }}
          />
        );
      },
    },
  ];

  return (
    <>
      <EuiPanel>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              id="xpack.uptime.monitorList.monitoringStatusTitle"
              defaultMessage="Monitor status"
            />
          </h5>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiBasicTable
          aria-label={labels.getDescriptionLabel(items.length)}
          error={errors ? formatUptimeGraphQLErrorList(errors) : errors}
          // Only set loading to true when there are no items present to prevent the bug outlined in
          // in https://github.com/elastic/eui/issues/2393 . Once that is fixed we can simply set the value here to
          // loading={loading}
          loading={loading && (!items || items.length < 1)}
          isExpandable={true}
          hasActions={true}
          itemId="monitor_id"
          itemIdToExpandedRowMap={getExpandedRowMap()}
          items={items}
          // TODO: not needed without sorting and pagination
          // onChange={onChange}
          noItemsMessage={
            hasActiveFilters ? labels.NO_MONITOR_ITEM_SELECTED : labels.NO_DATA_MESSAGE
          }
          // TODO: reintegrate pagination in future release
          // pagination={pagination}
          // TODO: reintegrate sorting in future release
          // sorting={sorting}
          columns={columns}
        />
        <EuiSpacer size="m" />
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <MonitorListPageSizeSelect size={props.pageSize} setSize={props.setPageSize} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup responsive={false}>
              <EuiFlexItem grow={false}>
                <OverviewPageLink
                  dataTestSubj="xpack.uptime.monitorList.prevButton"
                  direction="prev"
                  pagination={prevPagePagination}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <OverviewPageLink
                  dataTestSubj="xpack.uptime.monitorList.nextButton"
                  direction="next"
                  pagination={nextPagePagination}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
};

export const MonitorList = withUptimeGraphQL<MonitorListQueryResult, MonitorListProps>(
  MonitorListComponent,
  monitorStatesQuery
);
